"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  username: string
  email: string
  avatar?: string
  age: string
  starSign: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (
    name: string,
    username: string,
    email: string,
    password: string,
    age: string,
    starSign: string,
  ) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("fomo_user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock authentication - in real app, validate with backend
    if (email === "demo@fomo.app" && password === "Password1") {
      const mockUser: User = {
        id: "current-user",
        name: "Demo User",
        username: "demo_user",
        email: email,
        avatar: "/placeholder.svg?height=40&width=40",
        age: "25",
        starSign: "Aquarius",
      }

      setUser(mockUser)
      localStorage.setItem("fomo_user", JSON.stringify(mockUser))
      router.push("/")
    } else {
      throw new Error("Invalid credentials")
    }

    setIsLoading(false)
  }

  const signup = async (
    name: string,
    username: string,
    email: string,
    password: string,
    age: string,
    starSign: string,
  ) => {
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const newUser: User = {
      id: Date.now().toString(),
      name,
      username,
      email,
      age,
      starSign,
      avatar: "/placeholder.svg?height=40&width=40",
    }

    setUser(newUser)
    localStorage.setItem("fomo_user", JSON.stringify(newUser))
    router.push("/")

    setIsLoading(false)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("fomo_user")
    router.push("/login")
  }

  return <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
