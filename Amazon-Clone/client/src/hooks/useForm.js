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

  // Sets several fields at once, e.g. clearing state and city when the country changes.
  function setFieldValues(changes) {
    const nextValues = { ...values, ...changes }
    setValues(nextValues)
    const touchedNames = Object.keys(changes).filter((name) => touched[name])
    if (!touchedNames.length) return
    const nextErrors = validate(nextValues)
    setErrors((current) => ({
      ...current,
      ...Object.fromEntries(touchedNames.map((name) => [name, nextErrors[name]])),
    }))
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

  return { values, fieldProps, setFieldValues, validateAll, setErrors }
}
