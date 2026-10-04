import { useState } from 'react'

export function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  function validateField(name, nextValues) {
    setErrors((current) => ({ ...current, [name]: validate(nextValues)[name] }))
  }

  function handleChange(event) {
    const { name, value } = event.target
    const nextValues = { ...values, [name]: value }
    setValues(nextValues)
    if (touched[name]) validateField(name, nextValues)
  }

  function handleBlur(event) {
    const { name } = event.target
    setTouched((current) => ({ ...current, [name]: true }))
    validateField(name, values)
  }

  function validateAll() {
    const nextErrors = validate(values)
    setErrors(nextErrors)
    setTouched(Object.fromEntries(Object.keys(values).map((name) => [name, true])))
    return Object.values(nextErrors).every((error) => !error)
  }

  function fieldProps(name) {
    return {
      name,
      value: values[name],
      onChange: handleChange,
      onBlur: handleBlur,
      error: errors[name],
    }
  }

  return { values, fieldProps, validateAll, setErrors }
}
