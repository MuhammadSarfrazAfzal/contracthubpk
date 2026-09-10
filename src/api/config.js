// Centralized API configuration
// When deployed, Vercel rewrites /api and /uploads to the backend automatically.
// If VITE_API_URL is set (e.g. in development or custom deployment), it will prefix calls.

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export const getUploadUrl = (filename) => {
  if (!filename) return '';
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename;
  return `${API_BASE_URL}/uploads/${cleanFilename}`;
};
