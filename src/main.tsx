import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './App';
import { ToastProvider } from './components/ui';
import { flushQueue } from './lib/offline';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
  },
});

function Root() {
  // Flush the offline beneficiary queue whenever connectivity returns.
  useEffect(() => {
    const onOnline = () => {
      flushQueue().catch(() => undefined);
    };
    window.addEventListener('online', onOnline);
    flushQueue().catch(() => undefined);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
