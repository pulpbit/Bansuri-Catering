const API_BASE = 'https://bansuri-api.pulpbit.workers.dev/api';

let token = sessionStorage.getItem('admin_token') || '';

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error('Invalid credentials');
  const data = await res.json();
  token = data.token;
  sessionStorage.setItem('admin_token', data.token);
  return data;
}

export async function changePassword(oldPassword, newPassword) {
  const res = await fetch(`${API_BASE}/settings/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to change password');
  }
  return res.json();
}

export async function forgotPassword(email, resetUrlBase) {
  const res = await fetch(`${API_BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, resetUrlBase }),
  });
  if (!res.ok) throw new Error('Failed to request password reset');
  return res.json();
}

export async function resetPassword(token, newPassword) {
  const res = await fetch(`${API_BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to reset password');
  }
  return res.json();
}

export function logout() {
  token = '';
  sessionStorage.removeItem('admin_token');
  localStorage.removeItem('authToken');
}

async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

async function sendJSON(path, method, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

export const leadsApi = {
  list: () => getJSON('/leads'),
  updateStatus: (id, status) => sendJSON(`/leads/${id}/status`, 'PATCH', { status }),
  createQuote: (id) => getJSON(`/leads/${id}/quote`),
  remove: (id) => sendJSON(`/leads/${id}`, 'DELETE', {})
};

export async function createLeadPublic(payload) {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to submit lead');
  return res.json();
}

export const packagesApi = {
  list: () => getJSON('/packages'),
  create: (payload) => sendJSON('/packages', 'POST', payload),
  update: (id, payload) => sendJSON(`/packages/${id}`, 'PUT', payload),
  remove: (id) => sendJSON(`/packages/${id}`, 'DELETE', {}),
};

export const menuApi = {
  list: () => getJSON('/menu'),
  createCategory: (payload) => sendJSON('/menu/categories', 'POST', payload),
  updateCategory: (id, payload) => sendJSON(`/menu/categories/${id}`, 'PUT', payload),
  deleteCategory: (id) => sendJSON(`/menu/categories/${id}`, 'DELETE', {}),
  createItem: (payload) => sendJSON('/menu/items', 'POST', payload),
  updateItem: (id, payload) => sendJSON(`/menu/items/${id}`, 'PUT', payload),
  deleteItem: (id) => sendJSON(`/menu/items/${id}`, 'DELETE', {}),
};

export function getToken() {
  return token;
}
