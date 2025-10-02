import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import EmployeeDashboard from './pages/Employee/EmployeeDashboard'
import SubmitLeaveRequest from './pages/Employee/SubmitLeaveRequest'
import MyLeaveRequests from './pages/Employee/MyLeaveRequests'
import ManagerDashboard from './pages/Manager/Dashboard'
import PendingApprovals from './pages/Manager/PendingApprovals'
import ReviewLeave from './pages/Manager/ReviewLeave'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const AppRoutes = () => {
  const { user, isAuthenticated } = useAuth()
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/register" element={<Register />} />
      
      {/* Root route - redirect based on authentication */}
      <Route path="/" element={
        isAuthenticated ? (
          user?.is_manager ? <Navigate to="/manager/dashboard" replace /> : <Navigate to="/employee" replace />
        ) : (
          <Home />
        )
      } />
      
      {/* Employee Routes */}
      <Route path="/employee" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<EmployeeDashboard />} />
        <Route path="apply-leave" element={<SubmitLeaveRequest />} />
        <Route path="my-requests" element={<MyLeaveRequests />} />
      </Route>
      
      {/* Manager Routes */}
      <Route path="/manager" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<ManagerDashboard />} />
        <Route path="pending" element={<PendingApprovals />} />
        <Route path="review/:id" element={<ReviewLeave />} />
      </Route>
    </Routes>
  )
}

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <AppRoutes />
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App