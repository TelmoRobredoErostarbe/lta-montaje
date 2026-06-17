import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Debug: log env vars presence (not values) at startup
console.log('[lta-montaje] VITE_SUPABASE_URL set:', !!import.meta.env.VITE_SUPABASE_URL)
console.log('[lta-montaje] VITE_SUPABASE_ANON_KEY set:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)

// Register service worker for PWA / push notifications
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Capture install prompt for Android/Chrome
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as any).__deferredInstallPrompt = e;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
