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
        const userData: User = {
          id: session.user.id,
          name: session.user.user_metadata?.name || "User",
          username: session.user.user_metadata?.username || "user",
          email: session.user.email,
          avatar: session.user.user_metadata?.avatar_url,
          bio: session.user.user_metadata?.bio,
          joinDate: session.user.user_metadata?.joinDate,
          starSign: session.user.user_metadata?.starSign,
          age: session.user.user_metadata?.age,
        }
        setUser(userData)

        // Store user data in localStorage for other users to access
        const storedUsers = localStorage.getItem('fomo-users')
        const users = storedUsers ? JSON.parse(storedUsers) : {}
        
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
        if (session?.user) {
          const userData: User = {
            id: session.user.id,
            name: session.user.user_metadata?.name || "User",
            username: session.user.user_metadata?.username || "user",
            email: session.user.email,
            avatar: session.user.user_metadata?.avatar_url,
            bio: session.user.user_metadata?.bio,
            joinDate: session.user.user_metadata?.joinDate,
            starSign: session.user.user_metadata?.starSign,
            age: session.user.user_metadata?.age,
          }
          setUser(userData)

          // Store user data in localStorage for other users to access
          const storedUsers = localStorage.getItem('fomo-users')
          const users = storedUsers ? JSON.parse(storedUsers) : {}
          
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
        } else {
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
    if (error) throw error

    // Store user data in localStorage for other users to access
    if (data.user) {
      const storedUsers = localStorage.getItem('fomo-users')
      const users = storedUsers ? JSON.parse(storedUsers) : {}
      
      users[data.user.id] = {
        id: data.user.id,
        name,
        username,
        starSign,
        joinDate: new Date().toLocaleDateString(),
        avatar: data.user.user_metadata?.avatar_url,
        bio: "",
        age,
      }
      
      localStorage.setItem('fomo-users', JSON.stringify(users))
    }
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
