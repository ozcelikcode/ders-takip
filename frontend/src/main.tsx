import '@fontsource-variable/geist';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';
import { queryClient } from './lib/queryClient';
import { initialLanguage } from './i18n';
import { useLanguageStore } from './store/languageStore';


const render = () => ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Paint in the right language: a non-Turkish catalog is fetched first; if that fails, Turkish shows.
void useLanguageStore.getState().setLanguage(initialLanguage()).catch(() => undefined).finally(render);
