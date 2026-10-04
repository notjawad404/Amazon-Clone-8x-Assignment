import { useState } from 'react'
import { useSignUpMutation } from '../../features/auth/authApi'
import { useForm } from '../../hooks/useForm'
import { parseApiError } from '../../utils/apiError'
import { validateSignUp } from '../../utils/authValidation'
import { APP_NAME } from '../../utils/constants'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Checkbox from '../ui/Checkbox'
import Input from '../ui/Input'

const INITIAL_VALUES = { name: '', email: '', password: '', confirmPassword: '' }

export default function SignUpForm() {
  const form = useForm(INITIAL_VALUES, validateSignUp)
  const [signUp, { isLoading }] = useSignUpMutation()
  const [serverError, setServerError] = useState(null)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const passwordType = isPasswordVisible ? 'text' : 'password'

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError(null)
    if (!form.validateAll()) return

    const { name, email, password } = form.values
    const result = await signUp({ name, email, password })
    if (result.error) {
      const { message, fieldErrors } = parseApiError(result.error)
      setServerError(message)
      form.setErrors(fieldErrors)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      {serverError && <Alert title="There was a problem">{serverError}</Alert>}
      <Input
        label="Your name"
        autoComplete="name"
        placeholder="First and last name"
        {...form.fieldProps('name')}
      />
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        {...form.fieldProps('email')}
      />
      <Input
        label="Password"
        type={passwordType}
        autoComplete="new-password"
        placeholder="At least 8 characters"
        hint="Passwords must be at least 8 characters and include a letter and a number."
        {...form.fieldProps('password')}
      />
      <div>
        <Input
          label="Re-enter password"
          type={passwordType}
          autoComplete="new-password"
          {...form.fieldProps('confirmPassword')}
        />
        <Checkbox
          label="Show passwords"
          className="mt-2"
          checked={isPasswordVisible}
          onChange={(event) => setIsPasswordVisible(event.target.checked)}
        />
      </div>
      <Button type="submit" isLoading={isLoading} className="w-full">
        Create your {APP_NAME} account
      </Button>
      <p className="text-xs leading-relaxed">
        By creating an account, you agree to {APP_NAME}&apos;s Conditions of Use and Privacy Notice.
      </p>
    </form>
  )
}
