"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  MoreHorizontal,
  Users,
  Calendar,
  Sparkles,
  PartyPopper,
  UserPlus,
  UserCheck,
  Clock,
  Share,
  Edit,
  UserX,
  Camera,
  Upload,
} from "lucide-react"
import type { User } from "@/types/feed"

// Import the NotificationIcon and HamburgerMenu components at the top of the file
import { NotificationIcon } from "@/components/notification-icon"
import { HamburgerMenu } from "@/components/hamburger-menu"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/context/auth-context"
import { useParties } from "@/context/party-context"
import { useUserStats } from "@/hooks/use-user-stats"

// Extended user type for profile
interface ProfileUser extends User {
  bio?: string
  joinDate?: string
  starSign?: string
  hostedParties?: number
  attendedParties?: number
  friendCount?: number
  age?: number
}

export default function ProtectedProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  )
}

function ProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string
  const { user: authUser } = useAuth()
  const { parties } = useParties()
  const { stats, incrementFriendCount, decrementFriendCount } = useUserStats(userId)

  const [user, setUser] = useState<ProfileUser | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editAvatar, setEditAvatar] = useState<string | null>(null)

  useEffect(() => {
    // If the userId matches the current authenticated user, create a profile for them
    if (authUser && userId === authUser.id) {
      const currentUserProfile: ProfileUser = {
        id: authUser.id,
        name: authUser.name,
        username: authUser.username,
        avatar: authUser.avatar || "/placeholder.svg?height=120&width=120",
        friendStatus: "self",
        bio: authUser.bio || "",
        joinDate: authUser.joinDate || new Date().toLocaleDateString(),
        starSign: authUser.starSign || "",
        hostedParties: stats.hostedParties,
        attendedParties: stats.attendedParties,
        friendCount: stats.friendCount,
        age: authUser.age,
      }
      setUser(currentUserProfile)
      setEditName(currentUserProfile.name)
      setEditBio(currentUserProfile.bio || "")
    } else {
      // For other users, try to get their data from localStorage or create a placeholder
      // In a real app, this would fetch from an API
      const storedUsers = localStorage.getItem('fomo-users')
      const users = storedUsers ? JSON.parse(storedUsers) : {}
      const otherUserData = users[userId]
      
      if (otherUserData) {
        const otherUserProfile: ProfileUser = {
          id: userId,
          name: otherUserData.name || "Unknown User",
          username: otherUserData.username || "unknown",
          avatar: otherUserData.avatar || "/placeholder-user.jpg",
          friendStatus: "none",
          bio: otherUserData.bio || "",
          joinDate: otherUserData.joinDate || "",
          starSign: otherUserData.starSign || "",
          hostedParties: 0,
          attendedParties: 0,
          friendCount: 0,
          age: otherUserData.age,
        }
        setUser(otherUserProfile)
        setEditName(otherUserProfile.name)
        setEditBio(otherUserProfile.bio || "")
      } else {
        // Fallback for unknown users
        const fallbackProfile: ProfileUser = {
          id: userId,
          name: "Unknown User",
          username: "unknown",
          avatar: "/placeholder-user.jpg",
          friendStatus: "none",
          bio: "",
          joinDate: "",
          starSign: "",
          hostedParties: 0,
          attendedParties: 0,
          friendCount: 0,
          age: undefined,
        }
        setUser(fallbackProfile)
        setEditName(fallbackProfile.name)
        setEditBio(fallbackProfile.bio || "")
      }
    }
  }, [userId, authUser, stats])

  if (!user) {
    return <div>User not found</div>
  }

  const isCurrentUser = authUser && user.id === authUser.id

  const handleFriendAction = () => {
    if (user.friendStatus === "none") {
      setUser((prev) => (prev ? { ...prev, friendStatus: "pending" } : null))
      // In a real app, this would send a friend request to the server
    } else if (user.friendStatus === "pending") {
      setUser((prev) => (prev ? { ...prev, friendStatus: "none" } : null))
      // In a real app, this would cancel the friend request
    } else if (user.friendStatus === "friends") {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              friendStatus: "none",
              friendCount: (prev.friendCount || 0) - 1,
            }
          : null,
      )
      decrementFriendCount()
    }
  }

  const handleShare = async () => {
    // Create unique profile URL
    const profileUrl = `${window.location.origin}/profile/${user.id}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user.name}'s Profile`,
          text: `Check out ${user.name}'s profile on FOMO!`,
          url: profileUrl,
        })
      } catch (err) {
        console.log("Error sharing:", err)
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(profileUrl)
        alert("Profile link copied to clipboard!")
      } catch (err) {
        console.log("Error copying to clipboard:", err)
      }
    }
    setIsActionsMenuOpen(false)
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setUser((prev) =>
      prev
        ? {
            ...prev,
            name: editName,
            bio: editBio,
            avatar: editAvatar || prev.avatar,
          }
        : null,
    )

    // Update stored user data in localStorage
    if (authUser) {
      const storedUsers = localStorage.getItem('fomo-users')
      const users = storedUsers ? JSON.parse(storedUsers) : {}
      
      if (users[authUser.id]) {
        users[authUser.id] = {
          ...users[authUser.id],
          name: editName,
          bio: editBio,
          avatar: editAvatar || users[authUser.id].avatar,
        }
        localStorage.setItem('fomo-users', JSON.stringify(users))
      }
    }

    setIsSaving(false)
    setIsEditDialogOpen(false)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setEditAvatar(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBlock = () => {
    // Handle blocking logic here
    console.log(`Blocking user ${user.id}`)
    setIsBlockDialogOpen(false)
    router.back()
  }

  const getFriendButtonContent = () => {
    switch (user.friendStatus) {
      case "friends":
        return (
          <>
            <UserCheck className="w-4 h-4" />
            Friends
          </>
        )
      case "pending":
        return (
          <>
            <Clock className="w-4 h-4" />
            Cancel Request
          </>
        )
      default:
        return (
          <>
            <UserPlus className="w-4 h-4" />
            Add Friend
          </>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
          <div className="flex items-center gap-2">
            <NotificationIcon unreadCount={0} />
            <HamburgerMenu />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Profile Card */}
        <Card className="mx-4 mt-4 overflow-hidden">
          {/* Cover Banner */}
          <div className="h-32 bg-gradient-to-r from-purple-500 to-pink-500 relative">
            {/* Profile Picture */}
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
              <Avatar className="w-24 h-24 border-4 border-white">
                <AvatarImage src={user.avatar || "/placeholder.svg"} />
                <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
              </Avatar>
            </div>

            {/* Actions Menu */}
            <div className="absolute top-4 right-4">
              <Dialog open={isActionsMenuOpen} onOpenChange={setIsActionsMenuOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/20">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-64">
                  <div className="space-y-2">
                    <Button variant="ghost" onClick={handleShare} className="w-full justify-start gap-2">
                      <Share className="w-4 h-4" />
                      Share Profile
                    </Button>

                    {isCurrentUser ? (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsActionsMenuOpen(false)
                          setIsEditDialogOpen(true)
                        }}
                        className="w-full justify-start gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsActionsMenuOpen(false)
                          setIsBlockDialogOpen(true)
                        }}
                        className="w-full justify-start gap-2 text-red-600 hover:text-red-700"
                      >
                        <UserX className="w-4 h-4" />
                        Block User
                      </Button>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <CardContent className="pt-16 pb-6 text-center">
            {/* Friend Button */}
            {!isCurrentUser && (
              <div className="mb-4">
                <Button
                  onClick={handleFriendAction}
                  variant={user.friendStatus === "friends" ? "secondary" : "default"}
                  className="flex items-center gap-2"
                >
                  {getFriendButtonContent()}
                </Button>
              </div>
            )}

            {/* Name and Username */}
            <h1 className="text-2xl font-bold mb-1">{user.name}</h1>
            <p className="text-gray-500 mb-4">@{user.username}</p>

            {/* Age and Star Sign */}
            {(user.age || user.starSign) && (
              <div className="flex justify-center gap-4 text-sm text-gray-500 mb-4">
                {user.age && (
                  <span>{user.age} years old</span>
                )}
                {user.age && user.starSign && (
                  <span>•</span>
                )}
                {user.starSign && (
                  <span>{user.starSign}</span>
                )}
              </div>
            )}

            {/* Bio */}
            {user.bio && <p className="text-gray-700 mb-6 max-w-md mx-auto">{user.bio}</p>}

            {/* Join Date - only show if it has a value */}
            {user.joinDate && (
              <>
                <div className="flex justify-center gap-8 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined</span>
                  </div>
                </div>
                <div className="flex justify-center gap-8 text-sm font-medium mt-1">
                  <span>{user.joinDate}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* About Card */}
        <Card className="mx-4 mt-4 mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-6">About</h2>

            <div className="grid grid-cols-3 gap-4">
              {/* Hosted Parties */}
              <button className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <PartyPopper className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <div className="text-sm text-gray-500 mb-1">Hosted</div>
                <div className="text-xl font-bold">{user.hostedParties}</div>
                <div className="text-xs text-gray-400">parties</div>
              </button>

              {/* Attended Parties */}
              <button className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="text-sm text-gray-500 mb-1">Attended</div>
                <div className="text-xl font-bold">{user.attendedParties}</div>
                <div className="text-xs text-gray-400">parties</div>
              </button>

              {/* Friends */}
              <button className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <Users className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-sm text-gray-500 mb-1">Friends</div>
                <div className="text-xl font-bold">{user.friendCount}</div>
                <div className="text-xs text-gray-400">friends</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Profile Picture */}
            <div className="text-center">
              <Avatar className="w-20 h-20 mx-auto mb-4">
                <AvatarImage src={editAvatar || user.avatar} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>

              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm">
                  <Camera className="w-4 h-4 mr-1" />
                  Take Photo
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <label>
                    <Upload className="w-4 h-4 mr-1" />
                    Upload
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </Button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name" />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-1">Bio</label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>

            {/* Save Button */}
            <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block {user.name}?</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to block {user.name}? They won't be able to see your profile or contact you.
            </p>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBlock}>
                Block User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
