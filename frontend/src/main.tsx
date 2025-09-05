/**
 * Main application entry point - React implementation.
 */


import { createRoot } from 'react-dom/client';
import App from './App';

// Initialize React App
const container = document.getElementById('app');
if (!container) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(container);
root.render(<App />);