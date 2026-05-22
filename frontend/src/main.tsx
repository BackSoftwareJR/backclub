import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/config' // Initialize i18n
import App from './App.tsx'
import { setupIOSViewportFix } from './utils/iosViewportFix'

// Fix per problemi di viewport su iOS
setupIOSViewportFix();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
