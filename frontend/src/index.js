import React from 'react';
import ReactDOM from 'react-dom/client';
import TradeChart from '../components/TradeChart';
import './index.css';

const App = () => (
  <div>
    <TradeChart />
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
