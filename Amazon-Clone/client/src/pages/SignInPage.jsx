import { Link, useSearchParams } from 'react-router-dom'
import AuthCard from '../components/auth/AuthCard'
import SignInForm from '../components/auth/SignInForm'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { APP_NAME } from '../utils/constants'
import { authPath } from '../utils/redirect'

export default function SignInPage() {
  useDocumentTitle('Sign in')
  const [searchParams] = useSearchParams()

  return (
    <AuthCard
      title="Sign in"
      footer={
        <>
          <h2 className="font-bold">New to {APP_NAME}?</h2>
          <Link
            to={authPath('/signup', searchParams.get('redirect'))}
            className="text-link hover:text-link-hover hover:underline"
          >
            Create your {APP_NAME} account
          </Link>
        </>
      }
    >
      <SignInForm />
    </AuthCard>
  )
}
