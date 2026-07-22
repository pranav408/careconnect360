const DEFAULT_API_BASE_URL = '/api'

function removeTrailingSlashes(value: string): string {
  const normalized = value.replace(/\/+$/, '')
  return normalized || '/'
}

function createConfigError(message: string): Error {
  return new Error(`Invalid VITE_API_BASE_URL: ${message}`)
}

export function resolveApiBaseUrl(rawValue: string | undefined): string {
  if (typeof rawValue !== 'string') {
    return DEFAULT_API_BASE_URL
  }

  const trimmedValue = rawValue.trim()
  if (!trimmedValue) {
    return DEFAULT_API_BASE_URL
  }

  const normalizedInput = removeTrailingSlashes(trimmedValue)

  if (normalizedInput === DEFAULT_API_BASE_URL) {
    return DEFAULT_API_BASE_URL
  }

  if (normalizedInput.startsWith('/')) {
    throw createConfigError('relative values must be exactly "/api".')
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(normalizedInput)
  } catch {
    throw createConfigError(
      'value must be "/api" or an absolute HTTP/HTTPS URL that ends with "/api".',
    )
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw createConfigError('only HTTP and HTTPS protocols are supported.')
  }

  if (parsedUrl.search) {
    throw createConfigError('query strings are not allowed.')
  }

  if (parsedUrl.hash) {
    throw createConfigError('fragments are not allowed.')
  }

  const normalizedPath = removeTrailingSlashes(parsedUrl.pathname)
  if (!normalizedPath.endsWith('/api')) {
    throw createConfigError('absolute URL path must end with "/api".')
  }

  return `${parsedUrl.origin}${normalizedPath}`
}