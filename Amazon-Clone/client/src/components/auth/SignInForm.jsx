import { useState } from 'react'
import { useSignInMutation } from '../../features/auth/authApi'
import { useForm } from '../../hooks/useForm'
import { parseApiError } from '../../utils/apiError'
import { validateSignIn } from '../../utils/authValidation'
import { APP_NAME } from '../../utils/constants'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Checkbox from '../ui/Checkbox'
import Input from '../ui/Input'

export default function SignInForm() {
  const form = useForm({ email: '', password: '' }, validateSignIn)
  const [signIn, { isLoading }] = useSignInMutation()
  const [serverError, setServerError] = useState(null)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError(null)
    if (!form.validateAll()) return

    const result = await signIn(form.values)
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
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        {...form.fieldProps('email')}
      />
      <div>
        <Input
          label="Password"
          type={isPasswordVisible ? 'text' : 'password'}
          autoComplete="current-password"
          {...form.fieldProps('password')}
        />
        <Checkbox
          label="Show password"
          className="mt-2"
          checked={isPasswordVisible}
          onChange={(event) => setIsPasswordVisible(event.target.checked)}
        />
      </div>
      <Button type="submit" isLoading={isLoading} className="w-full">
        Sign in
      </Button>
      <p className="text-xs leading-relaxed">
        By continuing, you agree to {APP_NAME}&apos;s Conditions of Use and Privacy Notice.
      </p>
    </form>
  )
}
