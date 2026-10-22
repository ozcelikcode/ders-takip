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
import { useLanguageStore } from './store/languageStore';
import { useSettingsStore } from './store/settingsStore';


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

// Paint in the site's language as last seen on this device (cached public settings); if its catalog fails, Turkish shows.
void useLanguageStore.getState().setLanguage(useSettingsStore.getState().settings.language).catch(() => undefined).finally(render);
