const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  let body = null
  try { body = await res.json() } catch { /* empty response */ }
  if (!res.ok) {
    const err = new Error(body?.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return body
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  del: (path) => request(path, { method: 'DELETE' }),
}
