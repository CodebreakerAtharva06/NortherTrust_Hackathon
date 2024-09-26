// dashboard.js

// Fetch available currencies on page load
async function loadCurrencies() {
    const response = await fetch('/currencies');
    const currencies = await response.json();
    const currencySelect = document.getElementById('currencySelect');
  
    currencies.forEach(currency => {
        const option = document.createElement('option');
        option.value = currency;
        option.textContent = currency;
        currencySelect.appendChild(option);
    });
  }
  
  // Fetch exchange rates and render the chart
  async function fetchExchangeRates() {
    const currency2 = document.getElementById('currencySelect').value;
    const period = document.getElementById('periodSelect').value;
  
    const response = await fetch(`/get-exchange-rate?currency2=${currency2}&period=${period}`);
    const data = await response.json();
  
    if (data.error) {
        alert(data.error);
        return;
    }
  
    renderChart(data, period);
    displayPeakLowestDates(data);
  }
  
  // Render the exchange rate chart
  let chart; // Declare chart variable globally
  
  function renderChart(data, period) {
    const ctx = document.getElementById('exchangeRateChart').getContext('2d');
  
    // Clear the previous chart if it exists
    if (chart) {
        chart.destroy();
    }
  
    // Determine labels based on the period selected
    let labels;
    if (period === 'weekly') {
        labels = data.dates.map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short' }));
    } else if (period === 'monthly') {
        labels = data.dates.map(date => new Date(date).toLocaleString('default', { month: 'long', year: 'numeric' }));
    } else if (period === 'quarterly') {
        labels = ['Q1', 'Q2', 'Q3', 'Q4'];
    } else if (period === 'yearly') {
        labels = data.dates.map(date => new Date(date).getFullYear());
    }
  
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Exchange Rate (USD/${data.currency2})`,
                data: data.rates,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
  }
  
  // Display peak and lowest dates with their values
  function displayPeakLowestDates(data) {
    const peakLowestDatesDiv = document.getElementById('peakLowestDates');
    
    // Find the index of peak and lowest dates
    const peakIndex = data.dates.indexOf(data.peakDate);
    const lowestIndex = data.dates.indexOf(data.lowestDate);
  
    // Get the values for the peak and lowest dates
    const peakValue = data.rates[peakIndex];
    const lowestValue = data.rates[lowestIndex];
  
    peakLowestDatesDiv.innerHTML = `
        <p>Peak Date: ${data.peakDate} - Value: ${peakValue}</p>
        <p>Lowest Date: ${data.lowestDate} - Value: ${lowestValue}</p>
    `;
  }
  
  // Print the chart
  function printChart() {
    const canvas = document.getElementById('exchangeRateChart');
    const dataUrl = canvas.toDataURL();
  
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Print Chart</title>
            </head>
            <body>
                <h1>Exchange Rate Chart</h1>
                <img src="${dataUrl}" />
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
  
  // Event listeners
  document.getElementById('fetchDataBtn').addEventListener('click', fetchExchangeRates);
  document.getElementById('printChartBtn').addEventListener('click', printChart);
  
  // Add event listener for period change
  document.getElementById('periodSelect').addEventListener('change', fetchExchangeRates);
  
  // Load currencies when the page is ready
  loadCurrencies();
  