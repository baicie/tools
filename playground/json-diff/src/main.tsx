import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App'
import './assets/main.css'

const container = document.getElementById('app')
if (container) {
  const root = createRoot(container)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
