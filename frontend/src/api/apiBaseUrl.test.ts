import { describe, expect, it } from 'vitest'
import { resolveApiBaseUrl } from './apiBaseUrl'

describe('resolveApiBaseUrl', () => {
  it('returns /api when value is undefined', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('/api')
  })

  it('returns /api when value is empty', () => {
    expect(resolveApiBaseUrl('')).toBe('/api')
  })

  it('returns /api when value is whitespace-only', () => {
    expect(resolveApiBaseUrl('   \n\t  ')).toBe('/api')
  })

  it('keeps /api unchanged', () => {
    expect(resolveApiBaseUrl('/api')).toBe('/api')
  })

  it('normalizes /api/ to /api', () => {
    expect(resolveApiBaseUrl('/api/')).toBe('/api')
  })

  it('keeps valid absolute HTTPS api root', () => {
    expect(resolveApiBaseUrl('https://api.example.com/api')).toBe('https://api.example.com/api')
  })

  it('trims surrounding whitespace for nonblank values', () => {
    expect(resolveApiBaseUrl('  https://api.example.com/careconnect/api  ')).toBe(
      'https://api.example.com/careconnect/api',
    )
  })

  it('removes multiple trailing slashes', () => {
    expect(resolveApiBaseUrl('https://api.example.com/api///')).toBe('https://api.example.com/api')
  })

  it('does not duplicate /api in absolute urls', () => {
    expect(resolveApiBaseUrl('https://api.example.com/api')).toBe('https://api.example.com/api')
  })

  it('rejects origin-only absolute url', () => {
    expect(() => resolveApiBaseUrl('https://api.example.com')).toThrow(
      /path must end with "\/api"/i,
    )
  })

  it('rejects non-/api relative path', () => {
    expect(() => resolveApiBaseUrl('/v1')).toThrow(/relative values must be exactly "\/api"/i)
  })

  it('rejects unsupported protocol', () => {
    expect(() => resolveApiBaseUrl('ftp://api.example.com/api')).toThrow(
      /only HTTP and HTTPS protocols are supported/i,
    )
  })

  it('rejects query string', () => {
    expect(() => resolveApiBaseUrl('https://api.example.com/api?x=1')).toThrow(
      /query strings are not allowed/i,
    )
  })

  it('rejects fragment', () => {
    expect(() => resolveApiBaseUrl('https://api.example.com/api#v1')).toThrow(
      /fragments are not allowed/i,
    )
  })
})
