from flask import Flask, request, jsonify, send_from_directory
import pandas as pd
import numpy as np
import os

app = Flask(__name__)

# Load the exchange rate data once at startup
df = pd.read_csv('modified_exchange_rates.xls') 
df.columns = df.columns.str.strip()
df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
df.set_index('Date', inplace=True)

def get_currencies():
    """Return a list of available currencies from the dataframe."""
    return df.columns.tolist()

def calculate_volatility(currency1, currency2):
    """Calculate annualized volatility for the given two currencies."""
    data = df[[currency1, currency2]].dropna()

    if data.empty or len(data) < 2:
        return np.nan, np.nan

    log_returns1 = np.log(data[currency1] / data[currency1].shift(1)).dropna()
    log_returns2 = np.log(data[currency2] / data[currency2].shift(1)).dropna()

    volatility1 = log_returns1.std() * np.sqrt(252)
    volatility2 = log_returns2.std() * np.sqrt(252)

    return volatility1, volatility2

@app.route('/risk-indicator', methods=['POST'])
def risk_indicator():
    """Handle risk indicator calculation request for two selected currencies."""
    data = request.json
    currency1 = data.get('currency1')
    currency2 = data.get('currency2')
    print(f"Received currencies for risk indicator: {currency1}, {currency2}")  

    volatility1, volatility2 = calculate_volatility(currency1, currency2)

    return jsonify({
        'volatility1': round(volatility1, 4) if not np.isnan(volatility1) else None,
        'volatility2': round(volatility2, 4) if not np.isnan(volatility2) else None
    })

@app.route('/calculate-basket', methods=['POST'])
def calculate_basket():
    """Calculate the value of the currency basket based on the selected currencies and their weights."""
    data = request.json
    selected_currencies = data['currencies']

    latest_data = df.iloc[-1]

    basket_value = 0
    for currency_data in selected_currencies:
        currency = currency_data['currency']
        weight = currency_data['weight']
        rate = latest_data.get(currency)
        if rate is not None:
            basket_value += (weight / 100) * rate

    return jsonify({
        'basket_value': round(basket_value, 2)
    })

@app.route('/currencies', methods=['GET'])
def currencies():
    """Return a list of available currencies to the client.""" 
    return jsonify(get_currencies())

@app.route('/get-exchange-rate', methods=['GET'])
def get_exchange_rate():
    """Fetch exchange rate data for the selected currency pair and time period."""
    currency2 = request.args.get('currency2')
    period = request.args.get('period')

    if period == 'weekly':
        data = df.resample('W').mean()
    elif period == 'monthly':
        data = df.resample('M').mean()
    elif period == 'quarterly':
        data = df.resample('Q').mean()
    elif period == 'yearly':
        data = df.resample('Y').mean()
    else:
        return jsonify({'error': 'Invalid period selected'}), 400

    if currency2 not in data.columns:
        return jsonify({'error': f'{currency2} not found in data'}), 404

    rates = data[currency2].dropna()
    peak_date = rates.idxmax().strftime('%Y-%m-%d')
    lowest_date = rates.idxmin().strftime('%Y-%m-%d')

    return jsonify({
        'currency2': currency2,
        'dates': rates.index.strftime('%Y-%m-%d').tolist(),
        'rates': rates.values.tolist(),
        'peakDate': peak_date,
        'lowestDate': lowest_date
    })

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files (HTML, JS, etc.)."""
    return send_from_directory(os.getcwd(), filename)

@app.route('/')
def index():
    """Serve the dashboard HTML file."""
    return send_from_directory(os.getcwd(), 'dashboard.html')

@app.route('/custom-basket')
def custom_basket():
    """Serve the custom basket HTML file."""
    return send_from_directory(os.getcwd(), 'custom-basket.html')

if __name__ == '__main__':
    app.run(debug=True)
