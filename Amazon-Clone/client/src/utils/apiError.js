const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'

export function parseApiError(error) {
  const data = error?.data
  const fieldErrors = Object.fromEntries(
    (Array.isArray(data?.details) ? data.details : [])
      .filter((detail) => typeof detail.path === 'string' && detail.path)
      .map((detail) => [detail.path, detail.message]),
  )
  return {
    message: typeof data?.message === 'string' ? data.message : FALLBACK_MESSAGE,
    code: data?.code ?? null,
    fieldErrors,
  }
}
