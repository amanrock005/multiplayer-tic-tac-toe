// src/components/ProtectedRoute.jsx
// Wraps routes that require authentication.
// Shows a full-screen loader while restoring the session,
// then redirects to /login if no valid session exists.

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="page-center">
        <div className="spinner" />
        <p className="loading-text">Restoring session…</p>
      </div>
    )
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />
}
