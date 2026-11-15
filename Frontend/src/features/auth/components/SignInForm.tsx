import { Button } from '@/components/catalyst/button'
import { Description, ErrorMessage, Field, FieldGroup, Label } from '@/components/catalyst/fieldset'
import { Heading } from '@/components/catalyst/heading'
import { Input } from '@/components/catalyst/input'
import { Strong, Text } from '@/components/catalyst/text'
import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl'
import { ApiError } from '@/lib/api'
import { ArrowRightEndOnRectangleIcon, UserPlusIcon } from '@heroicons/react/20/solid'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'

type FormMode = 'signIn' | 'signUp'

type FormValues = { email: string; password: string; confirmation: string }

const DEMO_CREDENTIALS = { email: 'demo@example.com', password: '123456789' }

const MIN_PASSWORD_LENGTH = 6

const MODE_OPTIONS: readonly SegmentedOption<FormMode>[] = [
  { value: 'signIn', label: 'Sign in', icon: ArrowRightEndOnRectangleIcon },
  { value: 'signUp', label: 'Create account', icon: UserPlusIcon },
]

const COPY: Record<FormMode, { heading: string; lead: string; submit: string; submitting: string; switchPrompt: string; switchAction: string }> = {
  signIn: {
    heading: 'Welcome back',
    lead: "Sign in with an existing Peter67's Farm account.",
    submit: 'Sign in',
    submitting: 'Signing in…',
    switchPrompt: 'No account yet?',
    switchAction: 'Create one',
  },
  signUp: {
    heading: 'Create a new account',
    lead: 'Register with your email to save your own fields.',
    submit: 'Create account',
    submitting: 'Creating account…',
    switchPrompt: 'Already registered?',
    switchAction: 'Sign in instead',
  },
}

const INITIAL_VALUES: Record<FormMode, FormValues> = {
  signIn: { ...DEMO_CREDENTIALS, confirmation: '' },
  signUp: { email: '', password: '', confirmation: '' },
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
  const [values, setValues] = useState(INITIAL_VALUES)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const copy = COPY[mode]
  const { email, password, confirmation } = values[mode]
  const isSignUp = mode === 'signUp'

  const update = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [mode]: { ...current[mode], [field]: value } }))
  }

  const switchMode = (next: FormMode) => {
    setMode(next)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSignUp && password !== confirmation) {
      setError('Passwords do not match')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await (isSignUp ? signUp : signIn)({ email, password })
    } catch (reason) {
      setError(describeError(reason))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid w-full max-w-sm grid-cols-1 gap-8">
      <SegmentedControl value={mode} options={MODE_OPTIONS} onChange={switchMode} aria-label="Sign in or create an account" />
      <form key={mode} onSubmit={handleSubmit} className="grid grid-cols-1 gap-8">
        <div className="grid gap-2">
          <Heading>{copy.heading}</Heading>
          <Text>{copy.lead}</Text>
        </div>
        <FieldGroup>
          <Field>
            <Label>Email</Label>
            <Input
              type="email"
              name="email"
              autoComplete={isSignUp ? 'email' : 'username'}
              required
              value={email}
              onChange={(event) => update('email', event.target.value)}
            />
          </Field>
          <Field>
            <Label>Password</Label>
            {isSignUp && <Description>At least {MIN_PASSWORD_LENGTH} characters.</Description>}
            <Input
              type="password"
              name="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
              value={password}
              invalid={!isSignUp && error !== null}
              onChange={(event) => update('password', event.target.value)}
            />
            {!isSignUp && error && <ErrorMessage>{error}</ErrorMessage>}
          </Field>
          {isSignUp && (
            <Field>
              <Label>Repeat password</Label>
              <Input
                type="password"
                name="confirmation"
                autoComplete="new-password"
                required
                value={confirmation}
                invalid={error !== null}
                onChange={(event) => update('confirmation', event.target.value)}
              />
              {error && <ErrorMessage>{error}</ErrorMessage>}
            </Field>
          )}
        </FieldGroup>
        <Button type="submit" color={isSignUp ? 'emerald' : 'amber'} className="w-full" disabled={isSubmitting}>
          {isSignUp ? <UserPlusIcon data-slot="icon" /> : <ArrowRightEndOnRectangleIcon data-slot="icon" />}
          {isSubmitting ? copy.submitting : copy.submit}
        </Button>
        <Text>
          {copy.switchPrompt}{' '}
          <button
            type="button"
            onClick={() => switchMode(isSignUp ? 'signIn' : 'signUp')}
            className="underline decoration-zinc-950/50 hover:decoration-zinc-950 dark:decoration-white/50 dark:hover:decoration-white"
          >
            <Strong>{copy.switchAction}</Strong>
          </button>
        </Text>
      </form>
    </div>
  )
}
