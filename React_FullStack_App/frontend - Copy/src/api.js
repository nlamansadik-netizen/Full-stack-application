const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function apiFetch(path, options = {}) {
  const { method = 'GET', token, body } = options
  const headers = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => null)
      if (data?.detail) {
        message =
          typeof data.detail === 'string'
            ? data.detail
            : JSON.stringify(data.detail)
      }
    } else {
      const errorText = await response.text()
      if (errorText) {
        message = errorText
      }
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export function buildStoriesQuery(params = {}) {
  const searchParams = new URLSearchParams()

  if (params.category) {
    searchParams.set('category', params.category)
  }

  if (params.q) {
    searchParams.set('q', params.q)
  }

  if (params.sort) {
    searchParams.set('sort', params.sort)
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit))
  }

  const queryString = searchParams.toString()
  return queryString ? `/api/stories?${queryString}` : '/api/stories'
}