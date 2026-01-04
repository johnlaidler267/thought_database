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

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        await createProfile(userId)
      } else if (error) {
        throw error
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async (userId) => {
    if (!supabase) return

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            display_name: authUser?.user_metadata?.full_name || 
                          authUser?.user_metadata?.name || 
                          authUser?.email?.split('@')[0] || 
                          'User',
            avatar_url: authUser?.user_metadata?.avatar_url || null,
            notary_credits: 20,
          },
        ])
        .select()
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Error creating profile:', err)
    }
  }

  const signInWithApple = async () => {
    if (!supabase) return { error: 'Supabase not configured' }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/timeline`,
      },
    })
    
    return { data, error }
  }

  const signInWithGoogle = async () => {
    if (!supabase) return { error: 'Supabase not configured' }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/timeline`,
      },
    })
    
    return { data, error }
  }

  const signInWithEmail = async (email) => {
    if (!supabase) return { error: 'Supabase not configured' }
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/timeline`,
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

  const value = {
    user,
    profile,
    loading,
    signInWithApple,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

