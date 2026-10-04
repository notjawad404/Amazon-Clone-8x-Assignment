const SOURCES = ['params', 'query', 'body']

export function validate(schemas) {
  return (req, res, next) => {
    for (const source of SOURCES) {
      if (!schemas[source]) continue
      const parsed = schemas[source].parse(req[source] ?? {})
      // Express 5 exposes req.query as a getter, so it can't be assigned directly.
      Object.defineProperty(req, source, { value: parsed, writable: true, configurable: true })
    }
    next()
  }
}
