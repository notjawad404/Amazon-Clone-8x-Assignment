import { Link, useSearchParams } from 'react-router-dom'
import AuthCard from '../components/auth/AuthCard'
import SignUpForm from '../components/auth/SignUpForm'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { authPath } from '../utils/redirect'

export default function SignUpPage() {
  useDocumentTitle('Create account')
  const [searchParams] = useSearchParams()

  return (
    <AuthCard
      title="Create account"
      footer={
        <>
          <h2 className="font-bold">Already have an account?</h2>
          <Link
            to={authPath('/signin', searchParams.get('redirect'))}
            className="text-link hover:text-link-hover hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  )
}
