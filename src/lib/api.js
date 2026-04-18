const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function getApiUrl(endpoint) {
  return `${API_URL}${endpoint}`;
}

export default API_URL;