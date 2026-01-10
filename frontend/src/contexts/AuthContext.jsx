import { createContext, useContext, useEffect, useState, useRef } from 'react'
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
  const isInitializingRef = useRef(true)

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
        // Check if we're returning from OAuth or Magic Link (check both hash and query params)
        const hashParams = window.location.hash
        const searchParams = window.location.search
        const hasCode = searchParams && searchParams.includes('code=')
        const hasAccessToken = (hashParams && hashParams.includes('access_token')) || 
                              (searchParams && searchParams.includes('access_token'))
        const hasMagicLinkToken = searchParams && (searchParams.includes('token=') && 
                              (searchParams.includes('type=magiclink') || searchParams.includes('type=email')))
        const isOAuthCallback = hasCode || hasAccessToken
        const isMagicLinkCallback = hasMagicLinkToken
        
        if (isOAuthCallback || isMagicLinkCallback) {
          // OAuth or Magic Link callback detected - Supabase should process this automatically
          console.log('Processing auth callback...', { 
            hasCode, 
            hasAccessToken,
            hasMagicLinkToken,
            isOAuthCallback,
            isMagicLinkCallback,
            search: searchParams?.substring(0, 100) 
          })
          
          // DON'T clear the URL yet - let Supabase's detectSessionInUrl process it first
          // Try to get the session immediately, with a short retry loop if needed
          let authSession = null
          let authError = null
          let attempts = 0
          const maxAttempts = isMagicLinkCallback ? 3 : 5 // Magic links are usually faster
          
          while (attempts < maxAttempts && !authSession) {
            const { data: { session }, error } = await supabase.auth.getSession()
            authSession = session
            authError = error
            
            if (authSession) break
            
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, isMagicLinkCallback ? 100 : 200))
            attempts++
          }
          
          if (authSession) {
            const callbackType = isMagicLinkCallback ? 'Magic Link' : 'OAuth'
            console.log(`Session established from ${callbackType} callback`)
            setUser(authSession.user)
            // Clear auth params from URL now that session is established
            const cleanUrl = window.location.origin + window.location.pathname
            window.history.replaceState(null, '', cleanUrl)
            console.log(`Cleaned ${callbackType} params from URL`)
            // Set loading to false immediately, load profile in background
            setLoading(false)
            isInitializingRef.current = false
            loadProfile(authSession.user.id).catch(err => {
              console.warn('Background profile load failed:', err)
            })
            return
          } else {
            const callbackType = isMagicLinkCallback ? 'Magic Link' : 'OAuth'
            console.error(`Failed to establish session from ${callbackType} callback:`, authError)
            
            // For magic links, if we can't establish session, it might be expired or invalid
            if (isMagicLinkCallback) {
              console.warn('Magic link may be expired or invalid')
              setLoading(false)
              isInitializingRef.current = false
              return
            }
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
                          expires_at: parseInt(hashParamsObj.get('expires_at')) || Math.floor(Date.now() / 1000) + 3600,
                          expires_in: parseInt(hashParamsObj.get('expires_in')) || 3600,
                          token_type: 'bearer',
                          user: user
                        }
                        
                        console.log('Storing session data:', {
                          hasAccessToken: !!sessionData.access_token,
                          hasRefreshToken: !!sessionData.refresh_token,
                          expiresAt: sessionData.expires_at,
                          userId: sessionData.user?.id
                        })
                        
                        localStorage.setItem(storageKey, JSON.stringify(sessionData))
                        console.log('Session stored in localStorage')
                        
                        // Get session to verify
                        const { data: { session: manualSession } } = await supabase.auth.getSession()
                        
                        if (manualSession && manualSession.user) {
                          console.log('Session established manually from JWT')
                          setUser(manualSession.user)
                          const cleanUrl = window.location.origin + window.location.pathname
                          window.history.replaceState(null, '', cleanUrl)
                          setLoading(false)
                          isInitializingRef.current = false
                          loadProfile(manualSession.user.id).catch(err => {
                            console.warn('Background profile load failed:', err)
                          })
                          return
                        } else {
                          // Fallback: use the decoded user directly
                          console.log('Using decoded user directly')
                          setUser(user)
                          const cleanUrl = window.location.origin + window.location.pathname
                          window.history.replaceState(null, '', cleanUrl)
                          setLoading(false)
                          isInitializingRef.current = false
                          loadProfile(user.id).catch(err => {
                            console.warn('Background profile load failed:', err)
                          })
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
                    setLoading(false)
                    isInitializingRef.current = false
                    loadProfile(manualSession.user.id).catch(err => {
                      console.warn('Background profile load failed:', err)
                    })
                    return
                  } else {
                    console.error('Manual session extraction failed:', manualError)
                    console.error('Error details:', {
                      message: manualError?.message,
                      status: manualError?.status,
                      error: manualError?.error,
                      fullError: manualError
                    })
                    isInitializingRef.current = false
                    setLoading(false)
                  }
                }
              } catch (parseError) {
                console.error('Error parsing hash:', parseError)
                isInitializingRef.current = false
                setLoading(false)
              }
            } else {
              // OAuth callback failed - no tokens found
              isInitializingRef.current = false
              setLoading(false)
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
          // Set loading to false immediately so UI can render
          // Profile will load in the background
          setLoading(false)
          // Load profile in background (don't await - let it happen async)
          loadProfile(session.user.id).catch(err => {
            console.warn('Background profile load failed:', err)
          })
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
        setLoading(false)
      } finally {
        // Mark initialization as complete
        isInitializingRef.current = false
      }
    }
    
    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      // Skip INITIAL_SESSION event - initializeAuth handles it
      // This prevents double-loading on page refresh
      if (event === 'INITIAL_SESSION' && isInitializingRef.current) {
        console.log('Skipping INITIAL_SESSION - already handled by initializeAuth')
        return
      }
      
      setUser(session?.user ?? null)
      if (session?.user) {
        // Set loading to false immediately if we're not initializing
        if (!isInitializingRef.current) {
          setLoading(false)
        }
        // Only load profile if not already initializing (to avoid double-loading)
        // For SIGNED_IN events after initialization, load profile in background
        if (!isInitializingRef.current || event !== 'INITIAL_SESSION') {
          loadProfile(session.user.id).catch(err => {
            console.warn('Background profile load failed:', err)
          })
        }
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const loadProfile = async (userId, retryCount = 0) => {
    if (!supabase) {
      return
    }

    // Note: We don't set loading here anymore - it's set to false when user is set
    // This allows the UI to render immediately while profile loads in background

    try {
      console.log('Loading profile for user:', userId)
      // Verify session is valid before making database calls
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        console.error('No valid session when loading profile:', sessionError)
        return
      }

      console.log('Fetching profile from database...')
      
      // Fetch profile with timeout protection
      const { data, error } = await Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile query timeout after 2 seconds')), 2000)
        )
      ]).catch(async (timeoutError) => {
        // If timeout, try one more time quickly
        console.warn('Profile query timed out, retrying once...', timeoutError)
        return await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
      })

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Profile not found, creating new profile...')
        await createProfile(userId)
      } else if (error) {
        console.error('Error fetching profile:', error)
        // If 401 or auth error, retry once after a delay
        if ((error.status === 401 || error.message?.includes('JWT')) && retryCount < 2) {
          console.log('Retrying profile load after auth error...')
          await new Promise(resolve => setTimeout(resolve, 500))
          return loadProfile(userId, retryCount + 1)
        }
        // Don't throw - just log and continue without profile
        console.warn('Profile load failed, continuing without profile:', error)
      } else {
        console.log('Profile loaded successfully:', data)
        setProfile(data)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      // Don't throw - allow app to continue without profile
      console.warn('Profile load error, continuing without profile:', err)
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
      
      // Create profile with timeout protection
      const { data, error } = await Promise.race([
        supabase
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
          .single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile creation timeout after 2 seconds')), 2000)
        )
      ]).catch((timeoutError) => {
        console.warn('Profile creation timed out:', timeoutError)
        return { data: null, error: timeoutError }
      })

      if (error) {
        console.error('Error creating profile:', error)
        // Don't throw - allow app to continue without profile
        return
      }
      
      console.log('Profile created successfully:', data)
      setProfile(data)
      // Note: loading is set to false by the caller (loadProfile)
    } catch (err) {
      console.error('Error creating profile:', err)
      // Don't throw - allow app to continue without profile
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
    
    // signInWithOtp automatically handles both sign up and sign in
    // If the user doesn't exist, it will create an account
    // If they do exist, it will sign them in
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        // This makes it work for both sign up and sign in
        shouldCreateUser: true,
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

