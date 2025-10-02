// API service for Leave Approval System
// Handles all HTTP requests to the FastAPI backend

// Temporarily use local backend for forgot password functionality
const API_BASE_URL = 'http://localhost:8000'; // import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to make requests with authentication
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add Authorization header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Handle FormData (for file uploads if needed later)
    if (options.body && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        // More detailed error handling
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        if (data) {
          if (typeof data === 'object' && data.detail) {
            errorMessage = data.detail;
          } else if (typeof data === 'string') {
            errorMessage = data;
          } else if (data.message) {
            errorMessage = data.message;
          }
        }
        
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      // Only log critical errors in production
      if (import.meta.env.DEV) {
        console.error('API request failed:', {
          endpoint,
          error: error.message,
        });
      }
      throw error;
    }
  }

  // Authentication endpoints
  async login(credentials) {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    return this.request('/auth/login', {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set it for FormData
      body: formData,
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: userData,
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Password reset (OTP) endpoints
  async sendPasswordResetOtp(email) {
    try {
      return await this.request('/auth/forgot', {
        method: 'POST',
        body: { email },
      });
    } catch (err) {
      if (err.message && /404/.test(err.message)) {
        return await this.request('/auth/forgot-password', {
          method: 'POST',
          body: { email },
        });
      }
      throw err;
    }
  }

  async resetPassword({ email, otp, newPassword }) {
    try {
      return await this.request('/auth/reset', {
        method: 'POST',
        body: { email, otp, new_password: newPassword },
      });
    } catch (err) {
      if (err.message && /404/.test(err.message)) {
        return await this.request('/auth/reset-password', {
          method: 'POST',
          body: { email, otp, new_password: newPassword },
        });
      }
      throw err;
    }
  }

  // Leave management endpoints
  async submitLeaveRequest(leaveData) {
    return this.request('/leave/submit', {
      method: 'POST',
      body: leaveData,
    });
  }

  async getMyLeaveRequests() {
    return this.request('/leave/my-requests');
  }

  async getPendingApprovals() {
    return this.request('/leave/pending-approvals');
  }

  async getProcessedApprovals() {
    return this.request('/leave/processed-approvals');
  }

  async approveLeave(leaveId, actionData) {
    return this.request(`/leave/${leaveId}/approve`, {
      method: 'POST',
      body: actionData,
    });
  }

  async rejectLeave(leaveId, actionData) {
    return this.request(`/leave/${leaveId}/reject`, {
      method: 'POST',
      body: actionData,
    });
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
