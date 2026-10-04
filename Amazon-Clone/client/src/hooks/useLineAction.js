import { useState } from 'react'
import { parseApiError } from '../utils/apiError'

// Tracks one cart line's pending request and its error message.
export function useLineAction() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  async function run(action) {
    setIsPending(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(parseApiError(err).message)
    } finally {
      setIsPending(false)
    }
  }

  return { isPending, error, run }
}
