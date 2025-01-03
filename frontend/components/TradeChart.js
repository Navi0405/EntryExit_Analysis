import React, { useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

const TradeChart = () => {
  const [data, setData] = useState(null);
  const [symbol1, setSymbol1] = useState("");
  const [symbol2, setSymbol2] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const symbol = `${symbol1.toUpperCase()}_${symbol2.toUpperCase()}`;
      const response = await fetch(
        `http://127.0.0.1:8000/api/chart-data?symbol=${symbol}&start_date=${startDate}&end_date=${endDate}`
      );
      const result = await response.json();

      if (!result.chart || !result.chart.time || !result.chart.spread) {
        setError("No data available for this pair from the tradesheet");
        setData(null);
        return;
      }

      if (result.chart.time.length === 0) {
        setError("No data available for the date range of this pair from the tradesheet");
        setData(null);
        return;
      }

      setData(result);
    } catch (error) {
      setError("An error occurred while fetching the data");
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Input Validation
    if (!symbol1 || !symbol2 || !startDate || !endDate) {
      setError("All fields are required");
      return;
    }

    if (symbol1 === symbol2) {
      setError("The two symbols must be different");
      return;
    }

    // Check if the symbols are in the valid format (e.g., ending with "USDT")
    const isValidSymbol = (symbol) => /^[A-Z]+USDT$/.test(symbol);

    if (!isValidSymbol(symbol1) || !isValidSymbol(symbol2)) {
      setError("Invalid symbols. Please ensure symbols end with 'USDT' (e.g., BTCUSDT, ETHUSDT)");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError("The start date must be before the end date");
      return;
    }

    // Fetch Data
    fetchData();
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "time",
        time: { unit: "day" },
        title: { display: true, text: "Date" },
      },
      y: {
        title: { display: true, text: "Values" },
      },
    },
    plugins: {
      legend: { display: true, position: "top" },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x",
        },
        pan: { enabled: true, mode: "x" },
      },
    },
  };

  const shadingPlugin = {
    id: "shadingPlugin",
    beforeDraw: (chart) => {
      if (!data || !data.trades) return;

      const ctx = chart.ctx;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      data.trades.forEach((trade) => {
        const entryX = xScale.getPixelForValue(new Date(trade.entry_dt));
        const exitX = xScale.getPixelForValue(new Date(trade.exit_dt));

        if (isNaN(entryX) || isNaN(exitX)) return;

        const color = trade.profit_loss >= 0 ? "rgba(0, 128, 0, 0.3)" : "rgba(255, 0, 0, 0.3)";

        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(entryX, yScale.top, exitX - entryX, yScale.bottom - yScale.top);
        ctx.restore();
      });
    },
  };

  return (
    <div className="trade-chart-container">
      <form
        onSubmit={handleSubmit}
        className={`trade-form ${data ? "form-fixed" : "form-centered"}`}
      >
        <h2>Entry/Exit Analysis</h2>
        <h4>Note: To process the z-score and spread correctly, reduce the start date to 1mo. and widen the date range</h4>
        <h5>e.g. Start month Jan; Input Dec instead.</h5>
        <h5>Scroll in/out to view the inner/outter data.</h5>
        <div className="symbol-inputs">
          <input
            type="text"
            value={symbol1}
            onChange={(e) => setSymbol1(e.target.value.toUpperCase())}
            placeholder="First Symbol"
            className="input-field"
          />
          <input
            type="text"
            value={symbol2}
            onChange={(e) => setSymbol2(e.target.value.toUpperCase())}
            placeholder="Second Symbol"
            className="input-field"
          />
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="date-field"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="date-field"
        />
        <button type="submit" className="submit-button">
          Submit
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Processing Data...</p>
        </div>
      ) : (
        data && (
          <div className="chart-container">
            <Line
              data={{
                labels: data.chart.time,
                datasets: [
                  {
                    label: "Spread",
                    data: data.chart.spread,
                    borderColor: "blue",
                    borderWidth: 2,
                    fill: false,
                  },
                  {
                    label: "Z-Score",
                    data: data.chart.z_score.map((value) =>
                      value !== null ? value : null
                    ),
                    borderColor: "red",
                    borderWidth: 2,
                    fill: false,
                  },
                ],
              }}
              options={chartOptions}
              plugins={[shadingPlugin]}
            />
          </div>
        )
      )}
    </div>
  );
};

export default TradeChart;
