// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// cd E:\naka .\nakama.exe --database.address "postgres:mysql@127.0.0.1:5432/nakama" --runtime.path "d:\code files\tic-tac-toe\nakama\modules"

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
