"use client"

import { useState, useEffect, useRef } from "react"
import { PostItem } from "@/components/post-item"
import { FilterBar } from "@/components/filter-bar"
import { BottomNavigation, type TabType } from "@/components/bottom-navigation"
import { SearchTab } from "@/components/search-tab"
import { MessagesTab } from "@/components/messages-tab"
import { AnnouncementsTab } from "@/components/announcements-tab"
import { FloatingActionButton } from "@/components/floating-action-button"
import { NotificationIcon } from "@/components/notification-icon"
import type { Post, User, Comment, FilterState, Notification } from "@/types/feed"
import type { Party } from "@/types/party"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { HamburgerMenu } from "@/components/hamburger-menu"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw } from "lucide-react"

// Mock data
const currentUser: User = {
  id: "current-user",
  name: "You",
  username: "you",
  avatar: "/placeholder.svg?height=40&width=40",
  friendStatus: "self",
}

const mockUsers: User[] = []

const mockPosts: Post[] = []

const mockNotifications: Notification[] = []

const mockParties: Party[] = []

function FeedPage() {
  const [activeTab, setActiveTab] = useState<TabType>("feed")
  const [posts, setPosts] = useState<Post[]>(mockPosts)
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [filters, setFilters] = useState<FilterState>({})
  const [currentParty, setCurrentParty] = useState<Party | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number>(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Get party from URL params
  useEffect(() => {
    const partyId = searchParams.get("party")
    if (partyId) {
      const party = mockParties.find((p) => p.id === partyId)
      setCurrentParty(party || null)
    }
  }, [searchParams])

  // Handle tab parameter from URL (for party invites)
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "announcements") {
      setActiveTab("announcements")
    }
  }, [searchParams])

  // Check for new post from sessionStorage on component mount
  useEffect(() => {
    const newPostData = sessionStorage.getItem("newPost")
    if (newPostData) {
      const newPost = JSON.parse(newPostData)
      // Convert timestamp back to Date object
      newPost.timestamp = new Date(newPost.timestamp)
      setPosts((prevPosts) => [newPost, ...prevPosts])
      sessionStorage.removeItem("newPost")
      // Scroll to top to show the new post
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [])

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (contentRef.current?.scrollTop === 0 && startY.current > 0) {
      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current
      
      if (diff > 0) {
        e.preventDefault()
        const pullDistance = Math.min(diff * 0.5, 100)
        setPullDistance(pullDistance)
        setIsPulling(pullDistance > 20)
      }
    }
  }

  const handleTouchEnd = async () => {
    if (isPulling && pullDistance > 50) {
      setIsRefreshing(true)
      setPullDistance(0)
      setIsPulling(false)
      
      // Simulate refresh
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Refresh posts (in a real app, this would fetch new data)
      setPosts(prevPosts => [...prevPosts])
      setIsRefreshing(false)
    } else {
      setPullDistance(0)
      setIsPulling(false)
    }
    startY.current = 0
  }

  const handleReact = (postId: string, emoji: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const existingReaction = post.reactions.find((r) => r.emoji === emoji)
          const userHasReacted = post.reactions.some((r) => r.userReacted)
          
          if (existingReaction) {
            // If user already reacted to this emoji, remove the reaction
            if (existingReaction.userReacted) {
              return {
                ...post,
                reactions: post.reactions.map((r) =>
                  r.emoji === emoji
                    ? {
                        ...r,
                        count: r.count - 1,
                        userReacted: false,
                      }
                    : r,
                ),
              }
            } else {
              // If user hasn't reacted to this emoji, remove any existing reactions and add this one
              return {
                ...post,
                reactions: post.reactions.map((r) => ({
                  ...r,
                  userReacted: false,
                  count: r.userReacted ? r.count - 1 : r.count,
                })).map((r) =>
                  r.emoji === emoji
                    ? {
                        ...r,
                        count: r.count + 1,
                        userReacted: true,
                      }
                    : r,
                ),
              }
            }
          } else {
            // New reaction - remove any existing user reactions and add this one
            return {
              ...post,
              reactions: [
                ...post.reactions.map((r) => ({
                  ...r,
                  userReacted: false,
                  count: r.userReacted ? r.count - 1 : r.count,
                })),
                {
                  id: Date.now().toString(),
                  emoji,
                  label: emoji,
                  count: 1,
                  userReacted: true,
                },
              ],
            }
          }
        }
        return post
      }),
    )
  }

  const handleComment = (postId: string, content: string, parentId?: string, gifUrl?: string) => {
    const newComment: Comment = {
      id: Date.now().toString(),
      user: currentUser,
      content,
      timestamp: new Date(),
      replies: [],
      gifUrl,
    }

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          if (parentId) {
            // Add reply to existing comment
            const addReplyToComment = (comments: Comment[]): Comment[] =>
              comments.map((comment) =>
                comment.id === parentId
                  ? { ...comment, replies: [...comment.replies, newComment] }
                  : { ...comment, replies: addReplyToComment(comment.replies) },
              )

            return {
              ...post,
              comments: addReplyToComment(post.comments),
            }
          } else {
            // Add new top-level comment
            return {
              ...post,
              comments: [...post.comments, newComment],
            }
          }
        }
        return post
      }),
    )
  }

  const handleLocationClick = (location: string) => {
    setFilters({ location })
    setActiveTab("feed") // Switch to feed tab when filtering
  }

  const handleTagClick = (tag: string) => {
    setFilters({ tag })
    setActiveTab("feed") // Switch to feed tab when filtering
  }

  const handleHashtagClick = (hashtag: string) => {
    setFilters({ hashtag })
    setActiveTab("feed") // Switch to feed tab when filtering
  }

  const handleUserClick = (userId: string) => {
    // Navigate to user profile
    router.push(`/profile/${userId}`)
  }

  const handleSendFriendRequest = (userId: string) => {
    console.log("Sending friend request to:", userId)
    // Update user's friend status in posts
    setPosts((prevPosts) =>
      prevPosts.map((post) => ({
        ...post,
        user: post.user.id === userId ? { ...post.user, friendStatus: "pending" as const } : post.user,
      })),
    )
  }

  const handleClearFilter = (filterType: keyof FilterState) => {
    setFilters((prev) => ({ ...prev, [filterType]: undefined }))
  }

  const handleClearAllFilters = () => {
    setFilters({})
  }

  const handleNewPost = () => {
    // Navigate to new post page
    router.push("/new/post")
  }

  const handleSharePost = (postId: string, userId: string, message?: string) => {
    console.log(`Sharing post ${postId} with user ${userId}`, message)
    // In a real app, you would send this to your backend
    alert(`Post shared with ${mockUsers.find((u) => u.id === userId)?.name || "user"}`)
  }

  const handleDeletePost = (postId: string) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId))
    toast({
      title: "Post Deleted",
      description: "Your post has been deleted successfully.",
    })
  }

  const handleDeleteComment = (postId: string, commentId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const removeCommentFromArray = (comments: Comment[]): Comment[] =>
            comments.filter((comment) => {
              if (comment.id === commentId) {
                return false
              }
              return {
                ...comment,
                replies: removeCommentFromArray(comment.replies),
              }
            })

          return {
            ...post,
            comments: removeCommentFromArray(post.comments),
          }
        }
        return post
      }),
    )
    toast({
      title: "Comment Deleted",
      description: "Your comment has been deleted successfully.",
    })
  }

  const handleExitParty = () => {
    router.push("/")
  }

  const handlePartyCancelled = (partyId: string, partyName: string, cancelledBy: string) => {
    // Create a cancellation announcement post
    const cancellationPost: Post = {
      id: `cancellation-${Date.now()}`,
      user: {
        id: "host",
        name: cancelledBy,
        username: "party_host",
        avatar: "/placeholder.svg?height=40&width=40",
        location: "Main Stage",
        friendStatus: "none" as const,
        isHost: true,
      },
      content: `🚫 ${partyName} has been cancelled. We apologize for any inconvenience.`,
      tags: ["announcement", "cancelled"],
      timestamp: new Date(),
      reactions: [
        { id: "1", emoji: "😔", label: "Sad", count: 0, userReacted: false },
      ],
      comments: [],
      reposts: 0,
      userReposted: false,
    }

    // Add the cancellation post to the posts list
    setPosts(prevPosts => [cancellationPost, ...prevPosts])

    // Create a notification for the cancellation
    const cancellationNotification: Notification = {
      id: `notification-${Date.now()}`,
      type: "party_cancelled",
      users: [{
        id: "host",
        name: cancelledBy,
        username: "party_host",
        avatar: "/placeholder.svg?height=40&width=40",
        location: "Main Stage",
        friendStatus: "none" as const,
        isHost: true,
      }],
      timestamp: new Date(),
      read: false,
      partyId: partyId,
      partyName: partyName,
    }

    // Add the notification to the notifications list
    setNotifications(prevNotifications => [cancellationNotification, ...prevNotifications])

    // Show toast notification
    toast({
      title: "Party Cancelled",
      description: `${partyName} has been cancelled. All attendees have been notified.`,
      variant: "destructive",
    })
  }

  // Get posts based on active tab
  const getTabPosts = () => {
    switch (activeTab) {
      case "starred":
        return posts.filter((post) => post.user.friendStatus === "friends")
      case "announcements":
        return posts.filter((post) => post.user.isHost)
      default:
        return posts
    }
  }

  // Filter posts based on current filters (only for feed and starred tabs)
  const getFilteredPosts = () => {
    const tabPosts = getTabPosts()

    if (activeTab === "search" || activeTab === "messages" || activeTab === "announcements") {
      return tabPosts // These tabs handle their own filtering
    }

    return tabPosts.filter((post) => {
      if (filters.location && post.user.location !== filters.location) return false
      if (filters.tag && !post.tags.includes(filters.tag)) return false
      if (filters.hashtag && !post.content.includes(`#${filters.hashtag}`)) return false
      return true
    })
  }

  const filteredPosts = getFilteredPosts()
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
    const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
    return bTime - aTime
  })

  const getTabTitle = () => {
    if (currentParty) {
      switch (activeTab) {
        case "starred":
          return "Starred"
        case "announcements":
          return "Announcements"
        case "search":
          return "Search"
        case "messages":
          return "Messages"
        default:
          return currentParty.name
      }
    }

    switch (activeTab) {
      case "starred":
        return "Starred"
      case "announcements":
        return "Announcements"
      case "search":
        return "Search"
      case "messages":
        return "Messages"
      default:
        return "fomo"
    }
  }

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Navbar with Exit Button */}
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="w-10">
            {currentParty && (
              <Button variant="ghost" size="sm" onClick={handleExitParty} className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          <h1 className="text-lg font-semibold text-foreground">{getTabTitle()}</h1>

          <div className="flex items-center">
            <NotificationIcon unreadCount={unreadCount} />
            <HamburgerMenu />
          </div>
        </div>
      </div>

      {/* Filter Bar (only show for feed and starred tabs) */}
      {(activeTab === "feed" || activeTab === "starred") && (
        <div className="sticky top-[57px] z-40 bg-background border-b border-border">
          <FilterBar filters={filters} onClearFilter={handleClearFilter} onClearAll={handleClearAllFilters} />
        </div>
      )}

      {/* Content */}
      <div 
        ref={contentRef}
        className="max-w-2xl mx-auto overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {/* Pull-to-refresh indicator */}
        {(isPulling || isRefreshing) && (
          <div className="flex justify-center items-center py-4 mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm">
                {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
              </span>
            </div>
          </div>
        )}

        <div className="p-4">
          {activeTab === "search" ? (
            <SearchTab
              posts={posts}
              currentUser={currentUser}
              onReact={handleReact}
              onComment={handleComment}
              onLocationClick={handleLocationClick}
              onTagClick={handleTagClick}
              onHashtagClick={handleHashtagClick}
              onUserClick={handleUserClick}
              onSendFriendRequest={handleSendFriendRequest}
              onSharePost={handleSharePost}
              onDeletePost={handleDeletePost}
              onDeleteComment={handleDeleteComment}
              users={mockUsers}
            />
          ) : activeTab === "messages" ? (
            <MessagesTab currentUser={currentUser} users={mockUsers} posts={posts} partyName={currentParty?.name} />
          ) : activeTab === "announcements" ? (
            <AnnouncementsTab
              posts={posts}
              currentUser={currentUser}
              users={mockUsers}
              onReact={handleReact}
              onComment={handleComment}
              onLocationClick={handleLocationClick}
              onTagClick={handleTagClick}
              onHashtagClick={handleHashtagClick}
              onUserClick={handleUserClick}
              onSendFriendRequest={handleSendFriendRequest}
              onSharePost={handleSharePost}
              onDeletePost={handleDeletePost}
              onDeleteComment={handleDeleteComment}
              onPartyCancelled={handlePartyCancelled}
            />
          ) : sortedPosts.length === 0 ? (
            <div className="text-center text-muted-foreground mt-8">
              {activeTab === "starred" && "No posts from friends yet."}
              {activeTab === "feed" && "No posts found matching your filters."}
            </div>
          ) : (
            sortedPosts.map((post) => (
              <PostItem
                key={post.id}
                post={post}
                currentUser={currentUser}
                onReact={handleReact}
                onComment={handleComment}
                onLocationClick={handleLocationClick}
                onTagClick={handleTagClick}
                onHashtagClick={handleHashtagClick}
                onUserClick={handleUserClick}
                onSendFriendRequest={handleSendFriendRequest}
                onSharePost={handleSharePost}
                onDeletePost={handleDeletePost}
                onDeleteComment={handleDeleteComment}
                users={mockUsers}
              />
            ))
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton onClick={handleNewPost} />

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default function ProtectedFeedPage() {
  return (
    <ProtectedRoute>
      <FeedPage />
    </ProtectedRoute>
  )
}
