export function parseError(err) {
  const detail = err.response?.data?.detail
  if (!detail) return err.message || 'Request failed'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map(e => {
      const loc = Array.isArray(e.loc) ? e.loc.join(' → ') : ''
      return loc ? `${loc}: ${e.msg}` : e.msg
    }).join(' | ')
  }
  return JSON.stringify(detail)
}

export function createErrorMessage(error, context = '') {
  const message = parseError(error)
  return context ? `${context}: ${message}` : message
}
