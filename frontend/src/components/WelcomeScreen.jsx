import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function WelcomeScreen() {
  const { user, loading: authLoading, signInWithApple, signInWithGoogle, signInWithEmail } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Redirect to home if user is logged in
    if (!authLoading && user) {
      // Add a small delay to ensure session is fully established
      const timeoutId = setTimeout(() => {
        navigate('/', { replace: true })
      }, 50)
      
      return () => clearTimeout(timeoutId)
    }
  }, [user, authLoading, navigate])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div style={{ color: 'var(--muted-foreground)' }}>Loading...</div>
      </div>
    )
  }

  // In dev mode, this screen won't show (redirects immediately)
  // But if somehow we get here, show a message
  if (user && !import.meta.env.VITE_SUPABASE_URL) {
    return null // Will redirect via useEffect
  }

  const handleAppleSignIn = async () => {
    setLoading(true)
    setError(null)
    const { error } = await signInWithApple()
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await signInWithEmail(email)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setEmailSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-8" style={{ background: 'var(--paper)' }}>
      <div className="max-w-md w-full text-center">
        {/* Title */}
        <h1 className="text-6xl font-serif font-normal tracking-tight mb-4" style={{ color: 'var(--ink)' }}>
            Vellum
        </h1>
        <p className="text-xl font-serif mb-12" style={{ color: 'var(--muted-foreground)' }}>
          Never waste a good thought
        </p>

        {/* Sign In Options */}
        <div className="space-y-4 mb-8">
          {/* Apple Sign In */}
          <button
            onClick={handleAppleSignIn}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-3xl border font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--stroke)',
              color: 'var(--ink)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--muted)'
              e.currentTarget.style.borderColor = 'var(--ink)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card)'
              e.currentTarget.style.borderColor = 'var(--stroke)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </button>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-3xl border font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--stroke)',
              color: 'var(--ink)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--muted)'
              e.currentTarget.style.borderColor = 'var(--ink)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card)'
              e.currentTarget.style.borderColor = 'var(--stroke)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
              <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0 0 10 20z" fill="#34A853"/>
              <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 0 0 0 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
              <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Email Magic Link */}
        {!emailSent ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email to sign in or sign up"
                required
                disabled={loading}
                className="w-full px-6 py-4 rounded-3xl border font-medium focus:outline-none focus:ring-2 disabled:opacity-50"
                style={{ 
                  fontFamily: 'inherit',
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--stroke)',
                  color: 'var(--ink)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--ink)'
                  e.target.style.boxShadow = '0 0 0 2px var(--ring)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--stroke)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full px-6 py-4 rounded-3xl border font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--muted)',
                borderColor: 'var(--stroke)',
                color: 'var(--ink)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ink)'
                e.currentTarget.style.color = 'var(--paper)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--muted)'
                e.currentTarget.style.color = 'var(--ink)'
              }}
            >
              {loading ? 'Sending...' : 'Continue with Email'}
            </button>
          </form>
        ) : (
          <div className="p-6 rounded-3xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--stroke)' }}>
            <p className="font-medium mb-2" style={{ color: 'var(--ink)' }}>Check your email</p>
            <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
              We've sent a magic link to <strong style={{ color: 'var(--ink)' }}>{email}</strong>. Click the link to sign in or create your account.
            </p>
            <button
              onClick={() => {
                setEmailSent(false)
                setEmail('')
              }}
              className="text-sm underline"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Use a different email
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-900/30 border border-red-700/50 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Privacy Note */}
        <p className="mt-12 text-sm font-serif leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--muted-foreground)' }}>
          Your thoughts are private. We use industry-standard secure sign-on to ensure only you can access your account.
        </p>
      </div>
    </div>
  )
}

