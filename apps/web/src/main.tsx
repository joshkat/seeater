import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { restoreTheme } from './lib/theme';
import './styles/global.css';

// Restore the user's saved theme immediately so there's no flash.
restoreTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
