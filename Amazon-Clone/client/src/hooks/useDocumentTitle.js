import { useEffect } from 'react'
import { APP_NAME } from '../utils/constants'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
  }, [title])
}
