"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { clearUserCache } from "@/lib/cached-api"

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

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
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
