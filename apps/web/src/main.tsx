import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from './contexts/AppContext';
import { ChessMentorApp } from './pages/ChessMentorApp';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <ChessMentorApp />
    </AppProvider>
  </React.StrictMode>
);
