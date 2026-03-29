// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }  from './context/AuthContext'
import { GameProvider }  from './context/GameContext'
import ProtectedRoute    from './components/ProtectedRoute'
import LoginPage         from './pages/LoginPage'
import LobbyPage         from './pages/LobbyPage'
import GamePage          from './pages/GamePage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — require valid Nakama session */}
          <Route element={<ProtectedRoute />}>
            {/* GameProvider lives here so socket persists across lobby→game */}
            <Route element={<GameProvider />}>
              <Route path="/lobby" element={<LobbyPage />} />
              <Route path="/game"  element={<GamePage  />} />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/lobby" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
