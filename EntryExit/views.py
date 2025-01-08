import csv
import os
from django.http import JsonResponse
from django.conf import settings
from datetime import datetime
import pandas as pd
import numpy as np
from binance.client import Client
import logging
logger = logging.getLogger(__name__)


# Binance data fetcher
def fetch_binance_data(symbol, start_date, end_date, interval='4h'):
    # Fetch API credentials from environment variables
    api_key = os.environ.get('key')
    api_secret = os.environ.get('secret')

    if not api_key or not api_secret:
        raise ValueError("API Key and Secret not found in environment variables.")

    # Initialize Binance client
    client = Client(api_key=api_key, api_secret=api_secret)

    # Convert dates to Binance-compatible timestamps
    start_timestamp = int(pd.Timestamp(start_date).timestamp() * 1000)
    end_timestamp = int(pd.Timestamp(end_date).timestamp() * 1000)

    # Fetch historical klines (candlestick data)
    klines = client.get_historical_klines(symbol, interval, start_timestamp, end_timestamp)

    # Convert to DataFrame
    df = pd.DataFrame(klines, columns=[
        "open_time", "open", "high", "low", "close", "volume",
        "close_time", "quote_asset_volume", "number_of_trades",
        "taker_buy_base_volume", "taker_buy_quote_volume", "ignore"
    ])

    # Keep only relevant columns and convert to numeric
    df = df[["open_time", "close"]]
    df["open_time"] = pd.to_datetime(df["open_time"], unit='ms')
    df["close"] = pd.to_numeric(df["close"])

    return df

# Data processing for spread and z-score
def process_data(df1, df2, params, trades):
    alpha = params["alpha"]
    beta = params["beta"]
    window = params.get('window', 180)

    # Merge and preprocess data
    df = pd.concat([df1.set_index("open_time"), df2.set_index("open_time")], axis=1, join="inner")
    df.columns = ["price1", "price2"]
    df = np.log(df)

    # Calculate spread and z-score
    df["spread"] = df["price2"] - beta * df["price1"] - alpha
    df["s_mean"] = df["spread"].rolling(window=window).mean()
    df["s_std"] = df["spread"].rolling(window=window).std()
    df["z_score"] = (df["spread"] - df["s_mean"]) / df["s_std"]
    df["z_score"] = df["z_score"].shift(1)

    # Replace NaN and infinite values with None (JSON-compatible null)
    df = df.replace([np.inf, -np.inf, np.nan], None)

    return df

def read_csv_file(request):
    try:
        # Extract query parameters
        symbol = request.GET.get('symbol', None)
        start_date_str = request.GET.get('start_date', None)
        end_date_str = request.GET.get('end_date', None)

        # Validate query parameters
        if not symbol or not start_date_str or not end_date_str:
            return JsonResponse({'error': 'Missing query parameters: symbol, start_date, or end_date'}, status=400)

        # Parse dates
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        except ValueError:
            return JsonResponse({'error': 'Invalid date format. Expected YYYY-MM-DD.'}, status=400)

        # Split the symbol into individual pairs
        symbols = symbol.split("_")
        if len(symbols) != 2:
            return JsonResponse({'error': 'Invalid symbol format. Expected format: BASEQUOTE_BASEQUOTE.'}, status=400)

        # Fetch Binance data
        df1 = fetch_binance_data(symbols[0], start_date_str, end_date_str)
        df2 = fetch_binance_data(symbols[1], start_date_str, end_date_str)

        # Check for empty DataFrames
        if df1.empty or df2.empty:
            return JsonResponse({'error': 'No data returned from Binance for the specified symbols and date range.'}, status=404)

        # Process tradesheet CSV
        file_path = os.path.join(settings.BASE_DIR, 'EntryExit', 'data', '')
        if not os.path.exists(file_path):
            return JsonResponse({'error': 'Tradesheet CSV file not found'}, status=404)

        trades = pd.read_csv(file_path)
        trades["entry_dt"] = pd.to_datetime(trades["entry_dt"])
        trades["exit_dt"] = pd.to_datetime(trades["exit_dt"])
        trades = trades[(trades["symbol"] == symbol) &
                        (trades["entry_dt"] >= start_date) &
                        (trades["exit_dt"] <= end_date)]

        if trades.empty:
            return JsonResponse({'error': 'No trades found for the specified criteria.'}, status=404)

        # Process data to calculate spread and z-score
        params = {"alpha": 0, "beta": 1}
        df = process_data(df1, df2, params, trades)

        # Prepare response
        result = {
            "chart": {
                "time": df.index.strftime('%Y-%m-%d %H:%M:%S').tolist(),
                "spread": df["spread"].tolist(),
                "z_score": df["z_score"].tolist(),
            },
            "trades": trades.to_dict(orient="records"),
        }
        return JsonResponse(result, safe=False)

    except Exception as e:
        logger.error(f"Error processing data: {str(e)}", exc_info=True)  # Log the error with a full traceback
        return JsonResponse({'error': f'Error processing data: {str(e)}'}, status=500)