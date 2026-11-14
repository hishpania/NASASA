import { Button } from '@/components/catalyst/button'
import { ErrorMessage, Field, Label } from '@/components/catalyst/fieldset'
import { Heading } from '@/components/catalyst/heading'
import { Input } from '@/components/catalyst/input'
import { Strong, Text } from '@/components/catalyst/text'
import { ApiError } from '@/lib/api'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'

type FormMode = 'signIn' | 'signUp'

const COPY: Record<FormMode, { heading: string; submit: string; switchPrompt: string; switchAction: string }> = {
  signIn: {
    heading: 'Sign in to Neosphere',
    submit: 'Sign in',
    switchPrompt: 'No account yet?',
    switchAction: 'Create one',
  },
  signUp: {
    heading: 'Create your account',
    submit: 'Create account',
    switchPrompt: 'Already registered?',
    switchAction: 'Sign in',
  },
}

function describeError(reason: unknown): string {
  if (reason instanceof ApiError && reason.isUnauthorized) {
    return 'Wrong email or password'
  }
  return reason instanceof Error ? reason.message : 'Something went wrong'
}

export function SignInForm() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<FormMode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const copy = COPY[mode]

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      await (mode === 'signIn' ? signIn : signUp)({ email, password })
    } catch (reason) {
      setError(describeError(reason))
      setIsSubmitting(false)
    }
  }

  const toggleMode = () => {
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'))
    setError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
      <Heading>{copy.heading}</Heading>
      <Field>
        <Label>Email</Label>
        <Input
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field>
        <Label>Password</Label>
        <Input
          type="password"
          name="password"
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          required
          value={password}
          invalid={error !== null}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Field>
      <Button type="submit" color="amber" className="w-full" disabled={isSubmitting}>
        {copy.submit}
      </Button>
      <Text>
        {copy.switchPrompt}{' '}
        <button type="button" onClick={toggleMode} className="underline decoration-zinc-950/50 hover:decoration-zinc-950 dark:decoration-white/50 dark:hover:decoration-white">
          <Strong>{copy.switchAction}</Strong>
        </button>
      </Text>
    </form>
  )
}
