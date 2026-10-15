import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DatasetProvider, readInjectedDataset } from './lib/dataset';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DatasetProvider value={readInjectedDataset()}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </DatasetProvider>
  </React.StrictMode>
);
