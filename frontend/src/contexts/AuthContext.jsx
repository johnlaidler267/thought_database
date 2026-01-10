import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      // Development mode - create mock user
      const mockUser = {
        id: 'dev-user-123',
        email: 'dev@example.com',
        user_metadata: { full_name: 'Dev User' }
      }
      const mockProfile = {
        id: 'dev-user-123',
        display_name: 'Dev User',
        avatar_url: null,
        notary_credits: 20,
      }
      setUser(mockUser)
      setProfile(mockProfile)
      setLoading(false)
      return
    }

    // Get initial session and handle OAuth callback
    const initializeAuth = async () => {
      try {
        // Check if we're returning from OAuth (check both hash and query params)
        const hashParams = window.location.hash
        const searchParams = window.location.search
        const hasCode = searchParams && searchParams.includes('code=')
        const hasAccessToken = (hashParams && hashParams.includes('access_token')) || 
                              (searchParams && searchParams.includes('access_token'))
        const isOAuthCallback = hasCode || hasAccessToken
        
        if (isOAuthCallback) {
          // OAuth callback detected - Supabase should process this automatically
          console.log('Processing OAuth callback...', { 
            hasCode, 
            hasAccessToken,
            search: searchParams?.substring(0, 100) 
          })
          
          // DON'T clear the URL yet - let Supabase's detectSessionInUrl process it first
          // Wait longer for Supabase to process the hash and establish session
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Now try to get the session
          const { data: { session: oauthSession }, error: oauthError } = await supabase.auth.getSession()
          
          if (oauthSession) {
            console.log('Session established from OAuth callback')
            setUser(oauthSession.user)
            // Clear OAuth hash from URL now that session is established
            const cleanUrl = window.location.origin + window.location.pathname
            window.history.replaceState(null, '', cleanUrl)
            console.log('Cleaned OAuth hash from URL')
            // Load profile
            await loadProfile(oauthSession.user.id)
            return
          } else {
            console.error('Failed to establish session from OAuth callback:', oauthError)
            // Try manual extraction as fallback
            if (hasAccessToken && hashParams) {
              try {
                const hashParamsObj = new URLSearchParams(hashParams.substring(1))
                const accessToken = hashParamsObj.get('access_token')
                const refreshToken = hashParamsObj.get('refresh_token')
                
                if (accessToken && refreshToken) {
                  console.log('Attempting manual session extraction...')
                  console.log('Token info:', {
                    accessTokenLength: accessToken.length,
                    refreshTokenLength: refreshToken.length,
                    accessTokenPrefix: accessToken.substring(0, 20) + '...'
                  })
                  
                  // Try to set the session directly without validation first
                  // Store tokens in localStorage manually as a workaround
                  try {
                    const sessionData = {
                      access_token: accessToken,
                      refresh_token: refreshToken,
                      expires_at: hashParamsObj.get('expires_at') || (Date.now() / 1000 + 3600),
                      expires_in: hashParamsObj.get('expires_in') || 3600,
                      token_type: 'bearer',
                      user: null // Will be fetched
                    }
                    
                    // Decode JWT to get user info without API call
                    try {
                      const tokenParts = accessToken.split('.')
                      if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]))
                        console.log('Decoded token payload:', payload)
                        
                        // Create user object from token
                        const user = {
                          id: payload.sub,
                          email: payload.email,
                          user_metadata: payload.user_metadata || {},
                          app_metadata: payload.app_metadata || {},
                          aud: payload.aud,
                          role: payload.role
                        }
                        
                        // Store in localStorage (Supabase format)
                        // Get URL from supabase client or environment
                        const supabaseUrlValue = supabase?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL
                        const projectRef = supabaseUrlValue?.split('//')[1]?.split('.')[0] || 'wprgbbfrybnirtvyntyr'
                        const storageKey = `sb-${projectRef}-auth-token`
                        
                        const sessionData = {
                          access_token: accessToken,
                          refresh_token: refreshToken,
                          expires_at: parseInt(hashParamsObj.get('expires_at')) || (Date.now() / 1000 + 3600),
                          expires_in: parseInt(hashParamsObj.get('expires_in')) || 3600,
                          token_type: 'bearer',
                          user: user
                        }
                        
                        localStorage.setItem(storageKey, JSON.stringify(sessionData))
                        console.log('Session stored in localStorage')
                        
                        // Get session to verify
                        const { data: { session: manualSession } } = await supabase.auth.getSession()
                        
                        if (manualSession && manualSession.user) {
                          console.log('Session established manually from JWT')
                          setUser(manualSession.user)
                          const cleanUrl = window.location.origin + window.location.pathname
                          window.history.replaceState(null, '', cleanUrl)
                          await loadProfile(manualSession.user.id)
                          return
                        } else {
                          // Fallback: use the decoded user directly
                          console.log('Using decoded user directly')
                          setUser(user)
                          const cleanUrl = window.location.origin + window.location.pathname
                          window.history.replaceState(null, '', cleanUrl)
                          await loadProfile(user.id)
                          return
                        }
                      }
                    } catch (decodeError) {
                      console.error('Error decoding JWT:', decodeError)
                    }
                  } catch (storageError) {
                    console.error('Error storing session manually:', storageError)
                  }
                  
                  // Fallback: Try setSession anyway
                  const { data: { session: manualSession }, error: manualError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  })
                  
                  if (manualSession) {
                    console.log('Session established manually via setSession')
                    setUser(manualSession.user)
                    const cleanUrl = window.location.origin + window.location.pathname
                    window.history.replaceState(null, '', cleanUrl)
                    await loadProfile(manualSession.user.id)
                    return
                  } else {
                    console.error('Manual session extraction failed:', manualError)
                    console.error('Error details:', {
                      message: manualError?.message,
                      status: manualError?.status,
                      error: manualError?.error,
                      fullError: manualError
                    })
                  }
                }
              } catch (parseError) {
                console.error('Error parsing hash:', parseError)
              }
            }
          }
        }
        
        // Regular session check (not OAuth callback)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('Initial session check:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          email: session?.user?.email,
          error: error?.message 
        })
        
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }
        
        setUser(session?.user ?? null)
        if (session?.user) {
          // Wait a bit to ensure session is fully established
          await new Promise(resolve => setTimeout(resolve, 300))
          await loadProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
        setLoading(false)
      }
    }
    
    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      // Handle OAuth callback - wait a bit for session to be fully established
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Small delay to ensure session is fully processed
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      setUser(session?.user ?? null)
      if (session?.user) {
        // Wait a bit more before loading profile to ensure session is valid
        await new Promise(resolve => setTimeout(resolve, 200))
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const loadProfile = async (userId, retryCount = 0) => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      console.log('Loading profile for user:', userId)
      // Verify session is valid before making database calls
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        console.error('No valid session when loading profile:', sessionError)
        setLoading(false)
        return
      }

      console.log('Fetching profile from database...')
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Profile not found, creating new profile...')
        await createProfile(userId)
        setLoading(false)
      } else if (error) {
        console.error('Error fetching profile:', error)
        // If 401 or auth error, retry once after a delay
        if ((error.status === 401 || error.message?.includes('JWT')) && retryCount < 2) {
          console.log('Retrying profile load after auth error...')
          await new Promise(resolve => setTimeout(resolve, 500))
          return loadProfile(userId, retryCount + 1)
        }
        // For other errors, still set loading to false so UI doesn't hang
        setLoading(false)
        throw error
      } else {
        console.log('Profile loaded successfully:', data)
        setProfile(data)
        setLoading(false)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      // Always set loading to false on error so UI doesn't hang
      setLoading(false)
    }
  }

  const createProfile = async (userId) => {
    if (!supabase) return

    try {
      // Get the current session instead of calling getUser() which might fail with 401
      const { data: { session } } = await supabase.auth.getSession()
      const authUser = session?.user
      
      if (!authUser) {
        console.error('No user in session when creating profile')
        return
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            display_name: authUser.user_metadata?.full_name || 
                          authUser.user_metadata?.name || 
                          authUser.email?.split('@')[0] || 
                          'User',
            avatar_url: authUser.user_metadata?.avatar_url || 
                        authUser.user_metadata?.avatar_url || 
                        null,
            notary_credits: 20,
          },
        ])
        .select()
        .single()

      if (error) throw error
      console.log('Profile created successfully:', data)
      setProfile(data)
      // Note: loading is set to false by the caller (loadProfile)
    } catch (err) {
      console.error('Error creating profile:', err)
      // If profile creation fails, still set loading to false so UI doesn't hang
      setLoading(false)
    }
  }

  const signInWithApple = async () => {
    if (!supabase) return { error: 'Supabase not configured' }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
    
    return { data, error }
  }

  const signInWithGoogle = async () => {
    if (!supabase) return { error: 'Supabase not configured' }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
    
    return { data, error }
  }

  const signInWithEmail = async (email) => {
    if (!supabase) return { error: 'Supabase not configured' }
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    })
    
    return { data, error }
  }

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user?.id) {
      await loadProfile(user.id)
    }
  }

  const value = {
    user,
    profile,
    loading,
    signInWithApple,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

