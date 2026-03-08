import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useStore } from './store'
import { saveSessions, loadSessions } from './store/persist'
import './styles/tokens.css'
import './styles/globals.css'

// Hydrate sessions from localStorage
const saved = loadSessions()
if (saved.length > 0) {
  useStore.setState({ sessions: saved, activeSessionId: saved[0].localId })
}

// Subscribe and persist on change
useStore.subscribe((state) => {
  saveSessions(state.sessions)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
