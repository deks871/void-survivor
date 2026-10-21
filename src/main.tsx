import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for offline PWA support & Chrome installability
if ('serviceWorker' in navigator) {
  const registerServiceWorker = async () => {
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const reg = await navigator.serviceWorker.ready;
      if (reg.active && typeof performance !== 'undefined' && performance.getEntriesByType) {
        const resourceUrls = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter(Boolean);
        reg.active.postMessage({
          type: 'CACHE_LOADED_RESOURCES',
          urls: resourceUrls,
        });
      }
    } catch {
      // Silent fallback if service worker registration is restricted in nested frame
    }
  };

  if (document.readyState === 'complete') {
    void registerServiceWorker();
  } else {
    window.addEventListener('load', () => {
      void registerServiceWorker();
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
