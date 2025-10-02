import React, { createContext, useContext, useState, useEffect } from 'react'
import apiService from '../services/apiService'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    // Check if user is logged in and get fresh user data
    const initializeAuth = async () => {
      const token = localStorage.getItem('token')
      
      if (token) {
        try {
          // Get fresh user data from backend
          const userData = await apiService.getCurrentUser()
          
          // Map backend fields to frontend format
          const user = {
            id: userData.id,
            name: userData.full_name,
            email: userData.email,
            username: userData.username,
            role: userData.role,
            department: userData.department,
            is_manager: userData.is_manager,
            is_hr: userData.is_hr
          }
          
          localStorage.setItem('userData', JSON.stringify(user))
          setIsAuthenticated(true)
          setUser(user)
        } catch (error) {
          console.error('Failed to get user data:', error)
          // If token is invalid, clear it
          localStorage.removeItem('token')
          localStorage.removeItem('userData')
          setIsAuthenticated(false)
          setUser(null)
        }
      }
      setInitializing(false)
    }
    
    initializeAuth()
  }, [])

  const login = async (credentials) => {
    try {
      setLoading(true)
      const response = await apiService.login(credentials)
      
      // Store token
      localStorage.setItem('token', response.access_token)
      
      // Get real user data from backend
      const userData = await apiService.getCurrentUser()
      
      // Map backend fields to frontend format
      const user = {
        id: userData.id,
        name: userData.full_name,
        email: userData.email,
        username: userData.username,
        role: userData.role,
        department: userData.department,
        is_manager: userData.is_manager,
        is_hr: userData.is_hr
      }
      
      localStorage.setItem('userData', JSON.stringify(user))
      setIsAuthenticated(true)
      setUser(user)
      
      return { success: true }
    } catch (error) {
      console.error('Login failed:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData) => {
    try {
      setLoading(true)
      await apiService.register(userData)
      
      // Auto-login after successful registration using the username
      const loginResult = await login({ 
        username: userData.username, 
        password: userData.password 
      })
      
      if (!loginResult?.success) {
        return { success: false, error: loginResult?.error || 'Auto login failed after registration.' }
      }
      
      return { success: true }
    } catch (error) {
      console.error('Registration failed:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userData')
    setIsAuthenticated(false)
    setUser(null)
  }

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    register,
    logout,
  }

  if (initializing) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
