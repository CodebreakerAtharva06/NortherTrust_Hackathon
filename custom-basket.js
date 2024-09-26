let riskChart; // Variable to hold the chart instance
let totalWeight = 0;

// Function to add currency input dynamically
document.getElementById('addCurrencyBtn').addEventListener('click', addCurrencyInput);

// Function to calculate custom basket value based on user-selected currencies
document.getElementById('calculateBasketBtn').addEventListener('click', calculateBasketValue);

function calculateBasketValue() {
    const baseCurrency = document.getElementById('baseCurrency').value; // Get selected base currency
    const selectedCurrencies = Array.from(document.querySelectorAll('.basket-input-group')).map(group => {
        const currency = group.querySelector('select.currency').value;
        const weight = parseFloat(group.querySelector('input.weight').value);
        return { currency, weight };
    });

    const totalWeight = selectedCurrencies.reduce((acc, curr) => acc + curr.weight, 0);
    if (totalWeight !== 100) {
        alert('Total weight must equal 100%. Please adjust the weights.');
        return;
    }

    fetch('/calculate-basket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currencies: selectedCurrencies, baseCurrency }) // Include base currency
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('basketResult').textContent = `Custom Basket Value in ${baseCurrency}: ${data.basket_value}`;
    })
    .catch(error => {
        console.error('Error fetching basket value:', error);
        alert('Error fetching rates. Please try again.');
    });
}

// Function to load available currencies into dropdowns (for risk and basket sections)
function loadCurrencies() {
    fetch('/currencies')
        .then(response => response.json())
        .then(currencies => {
            const currency1Select = document.getElementById('currency1');
            const currency2Select = document.getElementById('currency2');
            const basketSelects = document.querySelectorAll('.currency');  // Basket dropdowns
            const baseCurrencySelect = document.getElementById('baseCurrency'); // Base currency dropdown

            currencies.forEach(currency => {
                const option1 = document.createElement('option');
                option1.value = currency;
                option1.textContent = currency;
                option1.title = currency;  // Ensures full name visible on hover
                currency1Select.appendChild(option1);
                currency2Select.appendChild(option1.cloneNode(true));  // Clone for second dropdown

                basketSelects.forEach(select => {
                    const option = document.createElement('option');
                    option.value = currency;
                    option.textContent = currency;
                    option.title = currency;  // Tooltip for full name
                    select.appendChild(option.cloneNode(true));
                });

                const baseOption = document.createElement('option');
                baseOption.value = currency;
                baseOption.textContent = currency;
                baseOption.title = currency;
                baseCurrencySelect.appendChild(baseOption);
            });
        })
        .catch(error => {
            console.error('Error loading currencies:', error);
        });
}

// Function to dynamically add more currencies with weight inputs
function addCurrencyInput() {
    if (totalWeight >= 100) {
        alert('Total weight cannot exceed 100%');
        return;
    }

    const basketContainer = document.getElementById('basketContainer');

    const currencyInputGroup = document.createElement('div');
    currencyInputGroup.classList.add('basket-input-group');

    const currencyLabel = document.createElement('label');
    currencyLabel.innerText = 'Select Currency:';

    const currencySelect = document.createElement('select');
    currencySelect.classList.add('currency');

    fetch('/currencies')
        .then(response => response.json())
        .then(currencies => {
            currencies.forEach(currency => {
                const option = document.createElement('option');
                option.value = currency;
                option.innerText = currency;
                option.title = currency;
                currencySelect.appendChild(option);
            });
        });

    const weightLabel = document.createElement('label');
    weightLabel.innerText = 'Weight (%):';

    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.classList.add('weight');
    weightInput.min = '0';
    weightInput.max = '100';
    weightInput.placeholder = 'Weight (%)';

    weightInput.addEventListener('input', () => {
        totalWeight = Array.from(document.querySelectorAll('.weight'))
            .map(input => parseFloat(input.value) || 0)
            .reduce((sum, val) => sum + val, 0);
        
        if (totalWeight > 100) {
            alert('Total weight cannot exceed 100%.');
            weightInput.value = '';
            totalWeight = Array.from(document.querySelectorAll('.weight'))
                .map(input => parseFloat(input.value) || 0)
                .reduce((sum, val) => sum + val, 0);
        }
    });

    currencyInputGroup.appendChild(currencyLabel);
    currencyInputGroup.appendChild(currencySelect);
    currencyInputGroup.appendChild(weightLabel);
    currencyInputGroup.appendChild(weightInput);

    basketContainer.appendChild(currencyInputGroup);
}

// Add event listener for calculating the risk indicator
document.getElementById('calculateRiskBtn').addEventListener('click', calculateRiskIndicator);

function calculateRiskIndicator() {
    const currency1 = document.getElementById('currency1').value.trim();
    const currency2 = document.getElementById('currency2').value.trim();

    if (!currency1 || !currency2) {
        alert('Please select both currencies.');
        return;
    }

    fetch('/risk-indicator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency1, currency2 })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Volatility Data:', data);
        drawRiskIndicatorChart(data.volatility1, data.volatility2);
        assessVolatility(data.volatility1, data.volatility2);
    })
    .catch(error => {
        console.error('Error fetching risk data:', error);
        alert('Error calculating risk. Please try again.');
    });
}

// Function to assess and display volatility level
function assessVolatility(volatility1, volatility2) {
    const averageVolatility = (volatility1 + volatility2) / 2;
    let volatilityLevel;

    console.log('Average Volatility:', averageVolatility);

    if (averageVolatility < 0.5) { // Very low
        volatilityLevel = "Very Low Volatility";
    } else if (averageVolatility >= 0.5 && averageVolatility < 1) { // Low
        volatilityLevel = "Low Volatility";
    } else if (averageVolatility >= 1 && averageVolatility < 2) { // Medium
        volatilityLevel = "Medium Volatility";
    } else { // High
        volatilityLevel = "High Volatility";
    }

    document.getElementById('riskResult').textContent = `Volatility Assessment: ${volatilityLevel} (Volatility1: ${volatility1}, Volatility2: ${volatility2})`;
}

// Function to draw the risk indicator chart
function drawRiskIndicatorChart(volatility1, volatility2) {
    const ctx = document.getElementById('riskIndicatorChart').getContext('2d');

    if (riskChart) {
        riskChart.destroy();
    }

    riskChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Currency 1 Volatility', 'Currency 2 Volatility'],
            datasets: [{
                label: 'Volatility Levels',
                data: [volatility1, volatility2],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Initial empty chart when page loads
drawRiskIndicatorChart(0, 0);

// Load currencies into dropdowns on page load
loadCurrencies();
