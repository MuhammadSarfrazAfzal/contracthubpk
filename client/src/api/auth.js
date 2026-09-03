// API utility functions for auth endpoints
const API_BASE = '/api/auth';

/**
 * Sign up a new user
 * @param {string} email
 * @param {string} password
 * @param {string} role
 * @returns {Promise<{token: string, user: object, message: string}>}
 */
export const signup = async (email, password, role) => {
  const response = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Signup failed');
  }
  return data;
};

/**
 * Log in an existing user
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user: object, message: string}>}
 */
export const login = async (email, password) => {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }
  return data;
};

/**
 * Get the currently authenticated user
 * @param {string} token
 * @returns {Promise<{user: object}>}
 */
export const getMe = async (token) => {
  const response = await fetch(`${API_BASE}/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch user');
  }
  return data;
};

/**
 * Get dashboard statistics
 * @param {string} token
 * @returns {Promise<{stats: object}>}
 */
export const getStats = async (token) => {
  const response = await fetch(`${API_BASE}/stats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch stats');
  }
  return data;
};

/**
 * Verify email with OTP
 * @param {string} email
 * @param {string} otp
 * @returns {Promise<{token: string, user: object, message: string}>}
 */
export const verifyOTP = async (email, otp) => {
  const response = await fetch(`${API_BASE}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Verification failed');
  }
  return data;
};

/**
 * Resend verification OTP
 * @param {string} email
 * @returns {Promise<{message: string}>}
 */
export const resendOTP = async (email) => {
  const response = await fetch(`${API_BASE}/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to resend OTP');
  }
  return data;
};
