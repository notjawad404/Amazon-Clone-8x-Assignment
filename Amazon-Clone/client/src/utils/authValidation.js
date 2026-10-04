const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function withoutEmpty(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message))
}

function emailError(email) {
  if (!email.trim()) return 'Enter your email address'
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address'
  return null
}

function newPasswordError(password) {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include a letter and a number'
  }
  return null
}

function nameError(name) {
  const trimmed = name.trim()
  if (!trimmed) return 'Enter your name'
  if (trimmed.length < 2) return 'Name must be at least 2 characters'
  if (trimmed.length > 50) return 'Name must be at most 50 characters'
  return null
}

export function validateSignIn({ email, password }) {
  return withoutEmpty({
    email: emailError(email),
    password: password ? null : 'Enter your password',
  })
}

export function validateSignUp({ name, email, password, confirmPassword }) {
  return withoutEmpty({
    name: nameError(name),
    email: emailError(email),
    password: newPasswordError(password),
    confirmPassword: confirmPassword === password ? null : 'Passwords must match',
  })
}
