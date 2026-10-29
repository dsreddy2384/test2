import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Suppress harmless Vite HMR WebSocket connection errors in cloud sandbox / preview environments
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      event.message?.includes('WebSocket') ||
      event.filename?.includes('@vite/client') ||
      event.filename?.includes('vite') ||
      event.message?.includes('HMR')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event.reason || '');
    if (
      reason.includes('WebSocket') ||
      reason.includes('@vite/client') ||
      reason.includes('HMR')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
