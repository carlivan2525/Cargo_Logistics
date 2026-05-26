const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Root of the backend server (without /api) — used for resolving upload URLs
const SERVER_ROOT = BASE.replace(/\/api$/, '');

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const api = {
  get:    (path)         => request(path),
  post:   (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
  // Multipart file upload — pass a FormData object as body
  upload: (path, formData) => {
    return fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` }, // no Content-Type: let browser set multipart boundary
      body: formData,
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      return data;
    });
  },
  // Resolve a stored image path to a full URL
  // Handles both legacy Base64 data URLs and new /uploads/... paths
  imageUrl: (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${SERVER_ROOT}${path}`;
  },
};
