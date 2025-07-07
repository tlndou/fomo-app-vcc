"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { clearUserCache } from "@/lib/cached-api"
import { validateEmail } from "@/lib/utils"

interface User {
  id: string
  name: string
  username: string
  avatar?: string
  email?: string
  bio?: string
  joinDate?: string
  starSign?: string
  age?: number
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, username: string, starSign?: string, age?: number) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  resendEmailConfirmation: (email: string) => Promise<{ success: boolean; message: string }>
  forceRefreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        console.log('🔍 Session user data:', session.user)
        console.log('🔍 User metadata:', session.user.user_metadata)
        
        // Try to get user data from localStorage as fallback
        const storedUsers = localStorage.getItem('fomo-users')
        const users = storedUsers ? JSON.parse(storedUsers) : {}
        const storedUserData = users[session.user.id]
        
        console.log('🔍 Stored user data:', storedUserData)
        
        const userData: User = {
          id: session.user.id,
          name: session.user.user_metadata?.name || storedUserData?.name || "User",
          username: session.user.user_metadata?.username || storedUserData?.username || "user",
          email: session.user.email,
          avatar: session.user.user_metadata?.avatar_url || storedUserData?.avatar,
          bio: session.user.user_metadata?.bio || storedUserData?.bio,
          joinDate: session.user.user_metadata?.joinDate || storedUserData?.joinDate,
          starSign: session.user.user_metadata?.starSign || storedUserData?.starSign,
          age: session.user.user_metadata?.age || storedUserData?.age,
        }
        
        console.log('🔍 Final user data:', userData)
        setUser(userData)

        // Store user data in localStorage for other users to access
        users[session.user.id] = {
          id: session.user.id,
          name: userData.name,
          username: userData.username,
          starSign: userData.starSign,
          joinDate: userData.joinDate,
          avatar: userData.avatar,
          bio: userData.bio,
          age: userData.age,
        }
        
        localStorage.setItem('fomo-users', JSON.stringify(users))
      }
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔍 Auth state change - Event:', event)
        console.log('🔍 Auth state change - Session:', session)
        
        if (session?.user) {
          console.log('🔍 Auth state change - Session user data:', session.user)
          console.log('🔍 Auth state change - User metadata:', session.user.user_metadata)
          
          // Try to get user data from localStorage as fallback
          const storedUsers = localStorage.getItem('fomo-users')
          const users = storedUsers ? JSON.parse(storedUsers) : {}
          const storedUserData = users[session.user.id]
          
          console.log('🔍 Auth state change - Stored user data:', storedUserData)
          
          // Prioritize user metadata from Supabase, fallback to localStorage, then defaults
          const userData: User = {
            id: session.user.id,
            name: session.user.user_metadata?.name || storedUserData?.name || "User",
            username: session.user.user_metadata?.username || storedUserData?.username || "user",
            email: session.user.email,
            avatar: session.user.user_metadata?.avatar_url || storedUserData?.avatar,
            bio: session.user.user_metadata?.bio || storedUserData?.bio,
            joinDate: session.user.user_metadata?.joinDate || storedUserData?.joinDate,
            starSign: session.user.user_metadata?.starSign || storedUserData?.starSign,
            age: session.user.user_metadata?.age || storedUserData?.age,
          }
          
          console.log('🔍 Auth state change - Final user data:', userData)
          setUser(userData)

          // Update localStorage with the latest data
          users[session.user.id] = {
            id: session.user.id,
            name: userData.name,
            username: userData.username,
            starSign: userData.starSign,
            joinDate: userData.joinDate,
            avatar: userData.avatar,
            bio: userData.bio,
            age: userData.age,
            email: userData.email,
          }
          
          localStorage.setItem('fomo-users', JSON.stringify(users))
          console.log('🔍 Auth state change - Updated localStorage with user data')
        } else {
          console.log('🔍 Auth state change - No session, clearing user')
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, name: string, username: string, starSign?: string, age?: number) => {
    console.log('🔧 SignUp: Starting signup process with data:', { email, name, username, starSign, age })
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          username,
          starSign,
          joinDate: new Date().toLocaleDateString(),
          age,
        }
      }
    })
    
    if (error) {
      console.error('❌ SignUp: Supabase error:', error)
      throw error
    }

    console.log('🔧 SignUp: Supabase response:', data)
    console.log('🔧 SignUp: User data from response:', data.user)
    console.log('🔧 SignUp: User metadata from response:', data.user?.user_metadata)

    // Store user data in localStorage immediately for fallback
    if (data.user) {
      const storedUsers = localStorage.getItem('fomo-users')
      const users = storedUsers ? JSON.parse(storedUsers) : {}
      
      const userData = {
        id: data.user.id,
        name,
        username,
        starSign,
        joinDate: new Date().toLocaleDateString(),
        avatar: data.user.user_metadata?.avatar_url,
        bio: "",
        age,
        email,
      }
      
      users[data.user.id] = userData
      localStorage.setItem('fomo-users', JSON.stringify(users))
      
      console.log('🔧 SignUp: Stored user data in localStorage:', userData)
      
      // Also set the user immediately if we have the data
      setUser(userData)
    }
    
    console.log('🔧 SignUp: Signup process completed')
  }

  const signOut = async () => {
    // Clear user cache before signing out
    if (user) {
      clearUserCache(user.id)
    }
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return

    const { error } = await supabase.auth.updateUser({
      data: updates
    })
    if (error) throw error

    setUser(prev => prev ? { ...prev, ...updates } : null)
  }

  const forceRefreshUserData = async () => {
    if (!user) return
    
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        console.log('🔄 Force refreshing user data...')
        console.log('🔄 Current session:', session)
        
        // Update user metadata in Supabase
        const { error } = await supabase.auth.updateUser({
          data: {
            name: user.name,
            username: user.username,
            starSign: user.starSign,
            joinDate: user.joinDate,
            bio: user.bio,
            age: user.age,
          }
        })
        
        if (error) {
          console.error('❌ Error updating user metadata:', error)
        } else {
          console.log('✅ User metadata updated successfully')
        }
      }
    } catch (error) {
      console.error('❌ Error in forceRefreshUserData:', error)
    }
  }

  // Temporary function for debugging - can be called from browser console
  const debugSetUserData = (name: string, username: string) => {
    if (!user) return
    
    console.log('🔧 Debug: Setting user data manually')
    
    const updatedUser = {
      ...user,
      name,
      username,
    }
    
    setUser(updatedUser)
    
    // Also update localStorage
    const storedUsers = localStorage.getItem('fomo-users')
    const users = storedUsers ? JSON.parse(storedUsers) : {}
    users[user.id] = {
      ...users[user.id],
      name,
      username,
    }
    localStorage.setItem('fomo-users', JSON.stringify(users))
    
    console.log('🔧 Debug: User data updated:', updatedUser)
  }

  // Permanent fix - updates Supabase user metadata
  const permanentFixUserData = async (name: string, username: string) => {
    if (!user) return
    
    try {
      console.log('🔧 Permanent fix: Updating Supabase user metadata...')
      
      // Create a clean user data object without circular references
      const cleanUserData = {
        name,
        username,
        starSign: user.starSign || undefined,
        joinDate: user.joinDate || new Date().toLocaleDateString(),
        bio: user.bio || undefined,
        age: user.age || undefined,
      }
      
      console.log('🔧 Permanent fix: Clean user data to send:', cleanUserData)
      
      // Update Supabase user metadata
      const { error } = await supabase.auth.updateUser({
        data: cleanUserData
      })
      
      if (error) {
        console.error('❌ Error updating Supabase metadata:', error)
        return false
      }
      
      // Update local state
      const updatedUser = {
        ...user,
        name,
        username,
      }
      setUser(updatedUser)
      
      // Update localStorage
      const storedUsers = localStorage.getItem('fomo-users')
      const users = storedUsers ? JSON.parse(storedUsers) : {}
      users[user.id] = {
        ...users[user.id],
        name,
        username,
      }
      localStorage.setItem('fomo-users', JSON.stringify(users))
      
      console.log('✅ Permanent fix: User metadata updated in Supabase!')
      console.log('✅ This will persist across all devices and sessions.')
      return true
      
    } catch (error) {
      console.error('❌ Error in permanentFixUserData:', error)
      return false
    }
  }

  // Test function to verify signup process works correctly
  const testSignupProcess = async () => {
    console.log('🧪 Test: Starting signup process test...')
    
    // Simulate user data that would be collected during signup
    const testUserData = {
      email: `test-${Date.now()}@example.com`,
      password: "TestPassword123!",
      name: "Test User",
      username: `testuser${Date.now()}`,
      starSign: "Aries",
      age: 25
    }
    
    console.log('🧪 Test: User data to test with:', testUserData)
    
    try {
      // This would normally be called during signup
      await signUp(
        testUserData.email,
        testUserData.password,
        testUserData.name,
        testUserData.username,
        testUserData.starSign,
        testUserData.age
      )
      
      console.log('🧪 Test: Signup process completed successfully')
      console.log('🧪 Test: Check localStorage for stored user data')
      
      // Check what's stored in localStorage
      const storedUsers = localStorage.getItem('fomo-users')
      console.log('🧪 Test: Stored users in localStorage:', storedUsers ? JSON.parse(storedUsers) : 'None')
      
    } catch (error) {
      console.error('🧪 Test: Signup process failed:', error)
    }
  }

  // Simple test function that doesn't create actual user accounts
  const testDataStorage = () => {
    console.log('🧪 Test: Testing data storage logic...')
    
    // Simulate user data
    const testUserData = {
      id: 'test-user-id',
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      starSign: 'Aries',
      age: 25,
      joinDate: new Date().toLocaleDateString(),
      bio: 'Test bio'
    }
    
    console.log('🧪 Test: Simulating user data:', testUserData)
    
    // Test localStorage storage
    const storedUsers = localStorage.getItem('fomo-users')
    const users = storedUsers ? JSON.parse(storedUsers) : {}
    
    users[testUserData.id] = testUserData
    localStorage.setItem('fomo-users', JSON.stringify(users))
    
    console.log('🧪 Test: Data stored in localStorage successfully')
    console.log('🧪 Test: Current localStorage:', JSON.parse(localStorage.getItem('fomo-users') || '{}'))
    
    // Clean up test data
    delete users[testUserData.id]
    localStorage.setItem('fomo-users', JSON.stringify(users))
    
    console.log('🧪 Test: Test data cleaned up')
  }

  // Debug function to check user data including star sign
  const debugUserData = () => {
    console.log('🔍 Debug: Checking user data...')
    
    // Check current user state
    console.log('🔍 Current user state:', user)
    
    // Check localStorage
    const storedUsers = localStorage.getItem('fomo-users')
    const users = storedUsers ? JSON.parse(storedUsers) : {}
    console.log('🔍 Stored users in localStorage:', users)
    
    // Check if current user exists in localStorage
    if (user) {
      const storedUserData = users[user.id]
      console.log('🔍 Current user data in localStorage:', storedUserData)
      
      if (storedUserData) {
        console.log('🔍 Star sign in localStorage:', storedUserData.starSign)
        console.log('🔍 Age in localStorage:', storedUserData.age)
        console.log('🔍 Join date in localStorage:', storedUserData.joinDate)
      }
    }
    
    // Check Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Supabase session:', session)
      if (session?.user) {
        console.log('🔍 Supabase user metadata:', session.user.user_metadata)
        console.log('🔍 Star sign in Supabase metadata:', session.user.user_metadata?.starSign)
      }
    })
  }

  // Fix star sign data for current user
  const fixStarSignData = async (starSign: string) => {
    if (!user) return
    
    try {
      console.log('🔧 Fix: Updating star sign data...')
      
      // Create a clean user data object without circular references
      const cleanUserData = {
        name: user.name,
        username: user.username,
        starSign,
        joinDate: user.joinDate || new Date().toLocaleDateString(),
        bio: user.bio,
        age: user.age,
      }
      
      console.log('🔧 Fix: Clean user data to send:', cleanUserData)
      
      // Update Supabase user metadata
      const { error } = await supabase.auth.updateUser({
        data: cleanUserData
      })
      
      if (error) {
        console.error('❌ Error updating Supabase metadata:', error)
        return false
      }
      
      // Update local state
      const updatedUser = {
        ...user,
        starSign,
      }
      setUser(updatedUser)
      
      // Update localStorage
      const storedUsers = localStorage.getItem('fomo-users')
      const users = storedUsers ? JSON.parse(storedUsers) : {}
      users[user.id] = {
        ...users[user.id],
        starSign,
      }
      localStorage.setItem('fomo-users', JSON.stringify(users))
      
      console.log('✅ Fix: Star sign data updated in Supabase and localStorage!')
      return true
      
    } catch (error) {
      console.error('❌ Error in fixStarSignData:', error)
      return false
    }
  }

  // Make debug function available globally for testing
  if (typeof window !== 'undefined') {
    (window as any).debugSetUserData = debugSetUserData
    ;(window as any).permanentFixUserData = permanentFixUserData
    ;(window as any).testSignupProcess = testSignupProcess
    ;(window as any).testDataStorage = testDataStorage
    ;(window as any).debugUserData = debugUserData
    ;(window as any).fixStarSignData = fixStarSignData
  }

  const resendEmailConfirmation = async (email: string): Promise<{ success: boolean; message: string }> => {
    // Rate limit: 1-min cooldown per email
    const cooldownKey = `fomo-resend-cooldown-${email}`
    const lastSent = localStorage.getItem(cooldownKey)
    const now = Date.now()
    if (lastSent && now - parseInt(lastSent) < 60_000) {
      const seconds = Math.ceil((60_000 - (now - parseInt(lastSent))) / 1000)
      return { success: false, message: `Please wait ${seconds}s before resending confirmation email.` }
    }
    if (!validateEmail(email)) {
      return { success: false, message: "Please enter a valid email address." }
    }
    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      })
      if (error) {
        let msg = error.message || "Failed to resend confirmation email."
        if (msg.includes('rate limit')) msg = "You are sending requests too quickly. Please wait a minute."
        return { success: false, message: msg }
      }
      localStorage.setItem(cooldownKey, now.toString())
      return { success: true, message: "Confirmation email sent! Please check your inbox and spam folder." }
    } catch (err: any) {
      return { success: false, message: "Network error. Please try again later." }
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      resendEmailConfirmation,
      forceRefreshUserData,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
