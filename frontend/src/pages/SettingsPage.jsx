import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../services/supabase'
import { LANGUAGES } from '../services/translation'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Detect environment mode based on API URL
export const getEnvironmentMode = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const isLocalhost = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')
  return isLocalhost ? 'Development' : 'Production'
}

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile, deleteAccount } = useAuth()
  const { isDark, toggleDarkMode } = useTheme()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [customerId, setCustomerId] = useState(null)
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteError, setDeleteError] = useState(null)
  const [exportingData, setExportingData] = useState(false)
  const [translationEnabled, setTranslationEnabled] = useState(() => {
    const saved = localStorage.getItem('translationEnabled')
    return saved ? JSON.parse(saved) : false
  })
  const [translationLanguage, setTranslationLanguage] = useState(() => {
    const saved = localStorage.getItem('translationLanguage')
    return saved || 'es'
  })
  
  // Determine user tier
  const getTier = () => {
    if (!profile) return 'trial'
    
    // Check for Sovereign mode (has OpenAI API key)
    if (profile.openai_api_key) {
      return 'sovereign'
    }
    
    // Check subscription tier from profile
    if (profile.tier === 'apprentice' || profile.tier === 'pro') {
      return profile.tier
    }
    
    // Default to trial
    return 'trial'
  }
  
  const tier = getTier()
  const hasStripeSubscription = profile?.stripe_subscription_id || false

  const handleLogOut = async () => {
    await signOut()
    navigate('/welcome', { replace: true })
  }

  const handleExportData = async () => {
    if (!user?.id || !supabase) {
      alert('Unable to export data. Please ensure you are logged in.')
      return
    }

    setExportingData(true)
    try {
      // Fetch all thoughts for the user
      const { data: thoughts, error: thoughtsError } = await supabase
        .from('thoughts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (thoughtsError) {
        throw new Error(`Failed to fetch thoughts: ${thoughtsError.message}`)
      }

      // Prepare export data
      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        profile: profile ? {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          tier: profile.tier,
          notary_credits: profile.notary_credits,
          credits_used: profile.credits_used,
          minutes_used: profile.minutes_used,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        } : null,
        thoughts: thoughts || [],
        summary: {
          totalThoughts: thoughts?.length || 0,
          totalTags: thoughts?.reduce((acc, thought) => acc + (thought.tags?.length || 0), 0) || 0,
        }
      }

      // Create JSON blob and download
      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `axiom-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting data:', error)
      alert(`Failed to export data: ${error.message}`)
    } finally {
      setExportingData(false)
    }
  }

  const handleDeleteAccountClick = () => {
    setShowDeleteModal(true)
    setDeleteConfirmation('')
    setDeleteError(null)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('You must type "DELETE" exactly to confirm.')
      return
    }

    setDeletingAccount(true)
    setDeleteError(null)
    
    try {
      const result = await deleteAccount()
      
      if (result.error) {
        setDeleteError(result.error)
        setDeletingAccount(false)
      } else {
        // Account deleted successfully, redirect to welcome page
        navigate('/welcome', { replace: true })
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      setDeleteError(error.message || 'Failed to delete account')
      setDeletingAccount(false)
    }
  }

  // Handle checkout success - verify session when returning from Stripe
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (sessionId && user?.id) {
      const verifySession = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/stripe/verify-session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
          })

          if (response.ok) {
            // Remove session_id from URL
            searchParams.delete('session_id')
            setSearchParams(searchParams, { replace: true })
            
            // Refresh profile to get updated subscription status
            await refreshProfile()
          }
        } catch (error) {
          console.error('Error verifying session:', error)
        }
      }

      verifySession()
    }
  }, [searchParams, user, refreshProfile, setSearchParams])

  // Load OpenAI API key and customer ID on mount
  useEffect(() => {
    if (profile) {
      setOpenaiApiKey(profile.openai_api_key || '')
      setCustomerId(profile.stripe_customer_id || null)
    }
  }, [profile])

  // Handle Subscribe/Upgrade button click
  // Handle Subscribe/Upgrade button click
const handleSubscribe = async (targetTier = 'pro') => {
  if (!user?.id || !user?.email) {
    console.error('User ID or email not available')
    return
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        email: user.email,
        tier: targetTier,
      }),
    })

    if (!response.ok) {
      // Get the actual error message from the response
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      throw new Error(errorData.error || 'Failed to create checkout session')
    }

    const data = await response.json()
    
    // Redirect to Stripe Checkout
    if (data.url) {
      window.location.href = data.url
    } else {
      throw new Error('No checkout URL returned')
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    // Show the actual error message
    alert(`Failed to start checkout: ${error.message}. Please check the console for details.`)
  }
}
  // Handle saving OpenAI API key
  const handleSaveOpenAIKey = async () => {
    if (!user?.id || !supabase) {
      console.error('User ID or Supabase not available')
      return
    }
    
    setSavingKey(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          openai_api_key: openaiApiKey,
          tier: openaiApiKey ? 'sovereign' : 'trial'
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      // Reload profile
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (data) {
        // Refresh profile in context
        await refreshProfile()
      }
    } catch (error) {
      console.error('Error saving API key:', error)
      alert('Failed to save API key. Please try again.')
    } finally {
      setSavingKey(false)
    }
  }

  // Handle Manage Billing button click
  const handleManageBilling = async () => {
    const customerIdToUse = customerId || profile?.stripe_customer_id
    
    if (!customerIdToUse) {
      console.error('Customer ID not available')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerIdToUse,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const data = await response.json()
      
      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error creating portal session:', error)
      alert('Failed to open billing portal. Please try again.')
    }
  }
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  
  // Calculate usage percentage
  const getUsagePercentage = (used, total) => {
    if (!total || total === 0) return 0
    return Math.min((used / total) * 100, 100)
  }

  // Handle translation settings changes
  const handleTranslationToggle = (enabled) => {
    setTranslationEnabled(enabled)
    localStorage.setItem('translationEnabled', JSON.stringify(enabled))
  }

  const handleTranslationLanguageChange = (langCode) => {
    setTranslationLanguage(langCode)
    localStorage.setItem('translationLanguage', langCode)
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col" style={{ background: 'var(--paper)' }}>
      {/* Header */}
      <header className="border-b border-stroke px-4 sm:px-6 py-3 sm:py-4" style={{ borderColor: 'var(--stroke)' }}>
        <div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-ink transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
            aria-label="Go to homepage"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-serif tracking-wide" style={{ color: 'var(--ink)' }}>Account Settings</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto space-y-6 sm:space-y-8">
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
              {/* Tier Display */}
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--stroke)' }}>
                <div>
                  <p className="text-base font-serif" style={{ color: 'var(--ink)' }}>
                    {tier === 'trial' && 'Free Trial'}
                    {tier === 'sovereign' && 'Sovereign Mode'}
                    {tier === 'apprentice' && 'Apprentice Tier'}
                    {tier === 'pro' && 'Notary Pro'}
                  </p>
                  {tier === 'apprentice' && (
                    <p className="text-xs font-serif mt-1" style={{ color: 'var(--muted-foreground)' }}>$5/month</p>
                  )}
                  {tier === 'pro' && (
                    <p className="text-xs font-serif mt-1" style={{ color: 'var(--muted-foreground)' }}>$12/month</p>
                  )}
                </div>
              </div>
              
              {/* Usage Display */}
              <div className="space-y-3">
                {tier === 'trial' && (
                  <>
                    <div className="flex justify-between text-sm font-serif">
                      <span style={{ color: 'var(--muted-foreground)' }}>Credits used</span>
                      <span style={{ color: 'var(--ink)' }}>
                        {profile?.credits_used || 0} / 20
                      </span>
                    </div>
                    {/* Usage Bar */}
                    <div className="w-full h-1 rounded-full" style={{ backgroundColor: 'var(--muted)' }}>
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${getUsagePercentage(profile?.credits_used || 0, 20)}%`,
                          backgroundColor: 'var(--ink)'
                        }}
                      />
                    </div>
                  </>
                )}
                
                {tier === 'sovereign' && (
                  <div className="flex justify-between text-sm font-serif">
                    <span style={{ color: 'var(--muted-foreground)' }}>API Key</span>
                    <span style={{ color: 'var(--ink)' }} className="font-mono">
                      {profile?.openai_api_key ? `sk-...${profile.openai_api_key.slice(-4)}` : 'Not set'}
                    </span>
                  </div>
                )}
                
                {tier === 'apprentice' && (
                  <>
                    <div className="flex justify-between text-sm font-serif">
                      <span style={{ color: 'var(--muted-foreground)' }}>Minutes used this month</span>
                      <span style={{ color: 'var(--ink)' }}>
                        {profile?.minutes_used || 0} / 300
                      </span>
                    </div>
                    {/* Usage Bar */}
                    <div className="w-full h-1 rounded-full" style={{ backgroundColor: 'var(--muted)' }}>
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${getUsagePercentage(profile?.minutes_used || 0, 300)}%`,
                          backgroundColor: 'var(--ink)'
                        }}
                      />
                    </div>
                  </>
                )}
                
                {tier === 'pro' && (
                  <div className="flex justify-between text-sm font-serif">
                    <span style={{ color: 'var(--muted-foreground)' }}>Notarizations</span>
                    <span style={{ color: 'var(--ink)' }}>Unlimited</span>
                  </div>
                )}
                
                {/* Next Billing Date (for paid subscriptions) */}
                {(tier === 'apprentice' || tier === 'pro') && profile?.next_billing_date && (
                  <div className="flex justify-between text-sm font-serif">
                    <span style={{ color: 'var(--muted-foreground)' }}>Next billing date</span>
                    <span style={{ color: 'var(--ink)' }}>
                      {formatDate(profile.next_billing_date)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* OpenAI API Key Input (for Sovereign mode or when not in Sovereign) */}
              {(tier === 'sovereign' || tier === 'trial') && (
                <div className="pt-2 space-y-2">
                  <label className="text-xs font-serif uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                    OpenAI API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="flex-1 border rounded px-4 py-2 text-sm font-mono"
                      style={{
                        backgroundColor: 'var(--muted)',
                        borderColor: 'var(--stroke)',
                        color: 'var(--ink)'
                      }}
                    />
                    <Button
                      onClick={handleSaveOpenAIKey}
                      variant="outline"
                      className="border-stroke hover:bg-muted font-serif text-sm bg-transparent"
                      disabled={savingKey}
                    >
                      {savingKey ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  {tier === 'trial' && (
                    <p className="text-xs font-serif" style={{ color: 'var(--muted-foreground)' }}>
                      Enter your OpenAI API key to enable Sovereign Mode
                    </p>
                  )}
                </div>
              )}
              
              {/* Action Button */}
              <Button
                variant="outline"
                onClick={() => {
                  if (hasStripeSubscription) {
                    handleManageBilling()
                  } else if (tier === 'trial') {
                    setShowUpgradeModal(true)
                  } else if (tier === 'sovereign' && hasStripeSubscription) {
                    handleManageBilling()
                  } else if (tier === 'apprentice' || tier === 'pro') {
                    // If they have a tier but no subscription ID, they might need to re-subscribe
                    handleManageBilling()
                  }
                }}
                className="w-full border-stroke hover:bg-muted font-serif text-sm mt-4 bg-transparent"
                disabled={tier === 'sovereign' && !hasStripeSubscription}
              >
                {hasStripeSubscription 
                  ? 'Manage Subscription'
                  : tier === 'trial'
                  ? 'Upgrade'
                  : tier === 'sovereign'
                  ? 'Manage Subscription'
                  : 'Upgrade to Pro'
                }
              </Button>
            </div>

            {/* Business / Team Sub-section */}
            <div 
              className="border-t p-6 -mx-6 -mb-6 mt-6 relative" 
              style={{ borderColor: 'var(--stroke)' }}
            >
              <div 
                className="absolute inset-0"
                style={{ 
                  backgroundColor: 'var(--muted)',
                  opacity: 0.3
                }}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-serif mb-1" style={{ color: 'var(--ink)' }}>Business / Team</p>
                  <p className="text-xs font-serif leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                    Want Axiom for your crew? Get bulk licensing and centralized billing.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = 'mailto:contact@example.com?subject=Business/Team Inquiry'
                  }}
                  className="border-stroke hover:bg-muted font-serif text-xs bg-transparent shrink-0"
                >
                  Contact Us
                </Button>
              </div>
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
                <button
                  onClick={toggleDarkMode}
                  className="relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors cursor-pointer"
                  style={{
                    borderColor: 'var(--stroke)',
                    backgroundColor: isDark ? 'var(--ink)' : 'var(--muted)'
                  }}
                  aria-label="Toggle dark mode"
                >
                  <span 
                    className="inline-block h-4 w-4 transform rounded-full transition-transform"
                    style={{
                      backgroundColor: isDark ? 'var(--paper)' : 'var(--ink)',
                      transform: isDark ? 'translateX(21px)' : 'translateX(1px)'
                    }}
                  />
                </button>
              </div>
            </div>
          </Card>

          {/* Translation Section */}
          <Card 
            className="border-stroke bg-card p-6 shadow-none"
            style={{
              borderColor: 'var(--stroke)',
              backgroundColor: 'var(--card)'
            }}
          >
            <h2 className="text-sm font-serif tracking-wide mb-4 uppercase" style={{ color: 'var(--ink)' }}>Translation</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--stroke)' }}>
                <div>
                  <p className="text-sm font-serif" style={{ color: 'var(--ink)' }}>Enable Translation</p>
                  <p className="text-xs font-serif mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Translate thought cards to your preferred language</p>
                </div>
                <button
                  onClick={() => handleTranslationToggle(!translationEnabled)}
                  className="relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors cursor-pointer"
                  style={{
                    borderColor: 'var(--stroke)',
                    backgroundColor: translationEnabled ? 'var(--ink)' : 'var(--muted)'
                  }}
                  aria-label="Toggle translation"
                >
                  <span 
                    className="inline-block h-4 w-4 transform rounded-full transition-transform"
                    style={{
                      backgroundColor: translationEnabled ? 'var(--paper)' : 'var(--ink)',
                      transform: translationEnabled ? 'translateX(21px)' : 'translateX(1px)'
                    }}
                  />
                </button>
              </div>
              
              {translationEnabled && (
                <div className="pt-2 space-y-2">
                  <label className="text-xs font-serif uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                    Target Language
                  </label>
                  <select
                    value={translationLanguage}
                    onChange={(e) => handleTranslationLanguageChange(e.target.value)}
                    className="w-full border rounded px-4 py-2 text-sm font-serif focus:outline-none"
                    style={{
                      backgroundColor: 'var(--muted)',
                      borderColor: 'var(--stroke)',
                      color: 'var(--ink)'
                    }}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs font-serif" style={{ color: 'var(--muted-foreground)' }}>
                    Select the language to translate your thoughts to
                  </p>
                </div>
              )}
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
                onClick={handleExportData}
                disabled={exportingData}
                className="w-full border-stroke hover:bg-muted font-serif text-sm justify-start bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportingData ? 'Exporting...' : 'Export All Data'}
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
                onClick={handleDeleteAccountClick}
                disabled={deletingAccount}
                className="w-full border-stroke hover:bg-destructive hover:text-destructive-foreground font-serif text-sm bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: 'var(--destructive)',
                  borderColor: 'var(--stroke)'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--destructive)'
                    e.currentTarget.style.color = 'var(--destructive-foreground)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--destructive)'
                }}
              >
                {deletingAccount ? 'Deleting Account...' : 'Delete Account'}
              </Button>
              <p className="text-xs font-serif" style={{ color: 'var(--muted-foreground)' }}>
                Permanently delete your account and all associated data
              </p>
            </div>
          </Card>
        </div>
      </main>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowUpgradeModal(false)}
        >
          <Card
            className="border-stroke bg-card p-6 shadow-lg max-w-md w-full"
            style={{
              borderColor: 'var(--stroke)',
              backgroundColor: 'var(--card)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-serif tracking-wide" style={{ color: 'var(--ink)' }}>
                  Choose Your Plan
                </h2>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-muted-foreground hover:text-ink transition-colors"
                  style={{ color: 'var(--muted-foreground)' }}
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Apprentice Plan */}
              <Card
                className="border-stroke bg-card p-4 cursor-pointer transition-all"
                style={{
                  borderColor: 'var(--stroke)',
                  backgroundColor: 'var(--card)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ink)'
                  e.currentTarget.style.backgroundColor = 'var(--muted)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--stroke)'
                  e.currentTarget.style.backgroundColor = 'var(--card)'
                }}
                onClick={() => {
                  setShowUpgradeModal(false)
                  handleSubscribe('apprentice')
                }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-serif" style={{ color: 'var(--ink)' }}>
                      Apprentice
                    </h3>
                    <span className="text-lg font-serif" style={{ color: 'var(--ink)' }}>
                      $5<span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>/month</span>
                    </span>
                  </div>
                  <p className="text-sm font-serif" style={{ color: 'var(--muted-foreground)' }}>
                    300 minutes per month
                  </p>
                </div>
              </Card>

              {/* Pro Plan */}
              <Card
                className="border-stroke bg-card p-4 cursor-pointer transition-all"
                style={{
                  borderColor: 'var(--stroke)',
                  backgroundColor: 'var(--card)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ink)'
                  e.currentTarget.style.backgroundColor = 'var(--muted)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--stroke)'
                  e.currentTarget.style.backgroundColor = 'var(--card)'
                }}
                onClick={() => {
                  setShowUpgradeModal(false)
                  handleSubscribe('pro')
                }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-serif" style={{ color: 'var(--ink)' }}>
                      Notary Pro
                    </h3>
                    <span className="text-lg font-serif" style={{ color: 'var(--ink)' }}>
                      $12<span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>/month</span>
                    </span>
                  </div>
                  <p className="text-sm font-serif" style={{ color: 'var(--muted-foreground)' }}>
                    Unlimited notarizations
                  </p>
                </div>
              </Card>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => !deletingAccount && setShowDeleteModal(false)}
        >
          <Card
            className="border-stroke bg-card p-6 shadow-lg max-w-md w-full"
            style={{
              borderColor: 'var(--stroke)',
              backgroundColor: 'var(--card)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-serif tracking-wide" style={{ color: 'var(--ink)' }}>
                  Delete Account
                </h2>
                {!deletingAccount && (
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="text-muted-foreground hover:text-ink transition-colors"
                    style={{ color: 'var(--muted-foreground)' }}
                    aria-label="Close"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-serif" style={{ color: 'var(--ink)' }}>
                  Are you sure you want to delete your account? This action cannot be undone.
                </p>
                
                <div className="space-y-2">
                  <p className="text-xs font-serif font-medium" style={{ color: 'var(--ink)' }}>
                    This will:
                  </p>
                  <ul className="text-xs font-serif space-y-1 ml-4" style={{ color: 'var(--muted-foreground)' }}>
                    <li>• Cancel your subscription (if active)</li>
                    <li>• Delete all your thoughts and data</li>
                    <li>• Permanently delete your account</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <label 
                    htmlFor="delete-confirmation"
                    className="block text-xs font-serif uppercase tracking-wide mb-2" 
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Type "DELETE" to confirm:
                  </label>
                  <input
                    id="delete-confirmation"
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => {
                      setDeleteConfirmation(e.target.value)
                      setDeleteError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !deletingAccount) {
                        handleDeleteAccount()
                      }
                    }}
                    disabled={deletingAccount}
                    className="w-full px-4 py-2 border rounded text-sm font-mono focus:outline-none disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--muted)',
                      borderColor: deleteError ? 'var(--destructive)' : 'var(--stroke)',
                      color: 'var(--ink)'
                    }}
                    placeholder="DELETE"
                    autoFocus
                  />
                  {deleteError && (
                    <p className="text-xs font-serif mt-2" style={{ color: 'var(--destructive)' }}>
                      {deleteError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmation('')
                    setDeleteError(null)
                  }}
                  disabled={deletingAccount}
                  className="flex-1 border-stroke hover:bg-muted font-serif text-sm bg-transparent disabled:opacity-50"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount || deleteConfirmation !== 'DELETE'}
                  className="flex-1 border-destructive hover:bg-destructive hover:text-destructive-foreground font-serif text-sm bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    color: 'var(--destructive)',
                    borderColor: 'var(--destructive)'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--destructive)'
                      e.currentTarget.style.color = 'var(--destructive-foreground)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--destructive)'
                  }}
                >
                  {deletingAccount ? 'Deleting...' : 'Delete Account'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Environment Mode Indicator - Only shown in development builds */}
      {import.meta.env.DEV && (
        <div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto mt-6 sm:mt-8 pb-6 sm:pb-8">
          <div className="text-center">
            <p className="text-xs font-serif" style={{ color: 'var(--muted-foreground)' }}>
              Environment: <span className="font-mono" style={{ color: 'var(--ink)' }}>{getEnvironmentMode()}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

