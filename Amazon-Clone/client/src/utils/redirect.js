const AUTH_PATHS = ['/signin', '/signup']

function isAuthPath(path) {
  return AUTH_PATHS.some((authPath) => path === authPath || path.startsWith(`${authPath}?`))
}

export function safeRedirect(value, fallback = '/') {
  const isInternal =
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  return isInternal && !isAuthPath(value) ? value : fallback
}

export function authPath(path, redirect) {
  const target = safeRedirect(redirect, null)
  return target && target !== '/' ? `${path}?redirect=${encodeURIComponent(target)}` : path
}
