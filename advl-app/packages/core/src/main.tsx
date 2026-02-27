/**
 * main.tsx — ADVL Core application entry point
 *
 * Bootstraps the React application. Creates the platform adapter singleton
 * before mounting, making it available to the entire component tree.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
