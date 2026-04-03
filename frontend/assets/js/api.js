const API_BASE = '/api';

let token = localStorage.getItem('authToken') || '';

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
  localStorage.setItem('authToken', token);
  return data;
}

export function logout() {
  token = '';
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
};

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
