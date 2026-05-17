import { useState, useCallback, useRef, useEffect } from 'react'

export function useAsync(asyncFn, immediate = true) {
  const [status, setStatus] = useState('idle')
  const [value, setValue] = useState(null)
  const [error, setError] = useState(null)
  const isMountedRef = useRef(true)

  const execute = useCallback(async (...args) => {
    setStatus('pending')
    setValue(null)
    setError(null)
    try {
      const response = await asyncFn(...args)
      if (isMountedRef.current) {
        setValue(response)
        setStatus('success')
      }
      return response
    } catch (err) {
      if (isMountedRef.current) {
        setError(err)
        setStatus('error')
      }
      throw err
    }
  }, [asyncFn])

  useEffect(() => {
    if (immediate) {
      execute()
    }
    return () => {
      isMountedRef.current = false
    }
  }, [execute, immediate])

  return { status, value, error, execute }
}
