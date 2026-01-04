import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Eye, EyeOff, Copy, Check, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyApiKey = async () => {
    try {
      // Example placeholder - replace with actual API key from your backend
      await navigator.clipboard.writeText("sk_live_EXAMPLE_PLACEHOLDER_REPLACE_WITH_REAL_KEY")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleLogOut = async () => {
    await signOut()
    navigate('/welcome', { replace: true })
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col" style={{ background: 'var(--paper)' }}>
      {/* Header */}
      <header className="border-b border-stroke px-6 py-4" style={{ borderColor: 'var(--stroke)' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-ink transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-serif tracking-wide" style={{ color: 'var(--ink)' }}>Account Settings</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* API Key Section */}
          <Card 
            className="border-stroke bg-card p-6 shadow-none"
            style={{
              borderColor: 'var(--stroke)',
              backgroundColor: 'var(--card)'
            }}
          >
            <h2 className="text-sm font-serif tracking-wide mb-4 uppercase" style={{ color: 'var(--ink)' }}>API Key</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div 
                  className="flex-1 border rounded px-4 py-3 font-mono text-sm"
                  style={{
                    backgroundColor: 'var(--muted)',
                    borderColor: 'var(--stroke)',
                    color: 'var(--ink)'
                  }}
                >
                  {apiKeyVisible ? "sk_live_EXAMPLE_PLACEHOLDER_REPLACE_WITH_REAL_KEY" : "••••••••••••••••••••••••••••••••"}
                </div>
                <Button
                  onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  variant="outline"
                  size="icon"
                  className="border-stroke hover:bg-muted"
                >
                  {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={handleCopyApiKey}
                  variant="outline"
                  size="icon"
                  className="border-stroke hover:bg-muted bg-transparent"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs font-serif" style={{ color: 'var(--muted-foreground)' }}>
                Use this key to access the Voice Notepad API from your applications
              </p>
            </div>
          </Card>

          {/* Subscription Section */}
          <Card 
            className="border-stroke bg-card p-6 shadow-none"
            style={{
              borderColor: 'var(--stroke)',
              backgroundColor: 'var(--card)'
            }}
          >
            <h2 className="text-sm font-serif tracking-wide mb-4 uppercase" style={{ color: 'var(--ink)' }}>Subscription</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--stroke)' }}>
                <div>
                  <p className="text-base font-serif" style={{ color: 'var(--ink)' }}>Current Plan</p>
                  <p className="text-xs font-serif mt-1" style={{ color: 'var(--muted-foreground)' }}>Billed monthly</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-serif" style={{ color: 'var(--ink)' }}>Professional</p>
                  <p className="text-xs font-serif mt-1" style={{ color: 'var(--muted-foreground)' }}>$29/month</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-serif">
                  <span style={{ color: 'var(--muted-foreground)' }}>Notes this month</span>
                  <span style={{ color: 'var(--ink)' }}>347 / Unlimited</span>
                </div>
                <div className="flex justify-between text-sm font-serif">
                  <span style={{ color: 'var(--muted-foreground)' }}>Storage used</span>
                  <span style={{ color: 'var(--ink)' }}>2.4 GB / 50 GB</span>
                </div>
                <div className="flex justify-between text-sm font-serif">
                  <span style={{ color: 'var(--muted-foreground)' }}>Next billing date</span>
                  <span style={{ color: 'var(--ink)' }}>Feb 15, 2026</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full border-stroke hover:bg-muted font-serif text-sm mt-4 bg-transparent"
              >
                Cancel Subscription
              </Button>
            </div>
          </Card>

          {/* Preferences Section */}
          <Card 
            className="border-stroke bg-card p-6 shadow-none"
            style={{
              borderColor: 'var(--stroke)',
              backgroundColor: 'var(--card)'
            }}
          >
            <h2 className="text-sm font-serif tracking-wide mb-4 uppercase" style={{ color: 'var(--ink)' }}>Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-serif" style={{ color: 'var(--ink)' }}>Dark Mode</p>
                  <p className="text-xs font-serif mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Switch to dark color scheme</p>
                </div>
                <div 
                  className="relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors cursor-pointer"
                  style={{
                    borderColor: 'var(--stroke)',
                    backgroundColor: 'var(--muted)'
                  }}
                >
                  <span 
                    className="inline-block h-4 w-4 transform rounded-full transition-transform"
                    style={{
                      backgroundColor: 'var(--ink)',
                      transform: 'translateX(1px)'
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Data Management Section */}
          <Card 
            className="border-stroke bg-card p-6 shadow-none"
            style={{
              borderColor: 'var(--stroke)',
              backgroundColor: 'var(--card)'
            }}
          >
            <h2 className="text-sm font-serif tracking-wide mb-4 uppercase" style={{ color: 'var(--ink)' }}>Data Management</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-stroke hover:bg-muted font-serif text-sm justify-start bg-transparent"
              >
                Export All Data
              </Button>
              <p className="text-xs font-serif" style={{ color: 'var(--muted-foreground)' }}>
                Download all your voice notes and metadata in JSON format
              </p>
            </div>
          </Card>

          {/* Account Actions Section */}
          <Card 
            className="border-stroke bg-card p-6 shadow-none"
            style={{
              borderColor: 'var(--stroke)',
              backgroundColor: 'var(--card)'
            }}
          >
            <h2 className="text-sm font-serif tracking-wide mb-4 uppercase" style={{ color: 'var(--ink)' }}>Account</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleLogOut}
                className="w-full border-stroke hover:bg-muted font-serif text-sm bg-transparent"
              >
                Log Out
              </Button>
              <Button
                variant="outline"
                className="w-full border-stroke hover:bg-destructive hover:text-destructive-foreground font-serif text-sm bg-transparent"
                style={{
                  color: 'var(--destructive)',
                  borderColor: 'var(--stroke)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--destructive)'
                  e.currentTarget.style.color = 'var(--destructive-foreground)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--destructive)'
                }}
              >
                Delete Account
              </Button>
              <p className="text-xs font-serif" style={{ color: 'var(--muted-foreground)' }}>
                Permanently delete your account and all associated data
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

