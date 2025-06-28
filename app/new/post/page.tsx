"use client"

import { useState, useEffect, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, ImageIcon, Tag, BarChart3, Repeat, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { LocationSelector } from "@/components/location-selector"
import { PollCreator } from "@/components/poll-creator"
import { GifPicker } from "@/components/gif-picker"
import type { Post } from "@/types/feed"
import { PresetTagSelector } from "@/components/preset-tag-selector"
import { MediaPicker } from "@/components/media-picker"

interface Poll {
  type: "vote" | "quiz" | "question"
  question: string
  options: Array<{ id: string; text: string; isCorrect?: boolean }>
}

export default function NewPostPage() {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [originalPost, setOriginalPost] = useState<Post | null>(null)
  const [selectedLocation, setSelectedLocation] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [poll, setPoll] = useState<Poll | null>(null)
  const [selectedGif, setSelectedGif] = useState<string | null>(null)
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: "image" | "video" } | null>(null)
  const [currentParty, setCurrentParty] = useState<any>(null)

  // Modal states
  const [showLocationSelector, setShowLocationSelector] = useState(false)
  const [showPresetTagSelector, setShowPresetTagSelector] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [showPollCreator, setShowPollCreator] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const maxLength = 250
  const hasProcessedRepost = useRef(false)

  // Handle mobile keyboard appearance
  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    // Set initial viewport height
    handleResize()

    // Listen for resize events (keyboard appearance/disappearance)
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  // Check for quote repost data only once
  useEffect(() => {
    if (hasProcessedRepost.current) return

    const repostData = searchParams.get("repost")
    if (repostData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(repostData))
        if (parsed.originalPost) {
          if (typeof parsed.originalPost.timestamp === "string") {
            parsed.originalPost.timestamp = new Date(parsed.originalPost.timestamp)
          }
          setOriginalPost(parsed.originalPost)
        }
      } catch (error) {
        console.error("Failed to parse repost data:", error)
      }
    }

    hasProcessedRepost.current = true
  }, [])

  // Get party data from URL params
  useEffect(() => {
    const partyId = searchParams.get("party")
    if (partyId) {
      // Mock party data - in a real app, this would come from your API
      const mockParty = {
        id: partyId,
        name: "Sarah's Birthday Bash",
        locationTags: [
          { id: "1", name: "Main Stage" },
          { id: "2", name: "Bar Area" },
          { id: "3", name: "Dance Floor" },
          { id: "4", name: "VIP Lounge" },
          { id: "5", name: "Garden" },
          { id: "6", name: "Rooftop" },
        ]
      }
      setCurrentParty(mockParty)
    }
  }, [searchParams])

  const handleSubmit = async () => {
    if (!content.trim() && !originalPost && !poll && !selectedGif && !selectedMedia) return

    setIsSubmitting(true)

    // Create new post object
    const newPost = {
      id: Date.now().toString(),
      user: {
        id: "current-user",
        name: "You",
        username: "you",
        avatar: "/placeholder.svg?height=40&width=40",
        friendStatus: "self" as const,
        location: selectedLocation || "Current Location",
      },
      content: content.trim(),
      tags: selectedTags,
      presetTag: null,
      timestamp: new Date(),
      reactions: [],
      comments: [],
      reposts: 0,
      userReposted: false,
      quotedPost: originalPost || undefined,
      poll: poll || undefined,
      gifUrl: selectedGif || undefined,
      media: selectedMedia || undefined,
    }

    // Store the new post in sessionStorage to be picked up by the feed
    sessionStorage.setItem("newPost", JSON.stringify(newPost))

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Navigate back to feed with party parameter if it exists
    const partyId = searchParams.get("party")
    if (partyId) {
      router.push(`/feed?party=${partyId}`)
    } else {
      router.push("/feed")
    }
  }

  const handleCancel = () => {
    router.back()
  }

  const getRelativeTime = (timestamp: Date): string => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "now"
    if (diffInMinutes < 60) return `${diffInMinutes}m`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d`

    return timestamp.toLocaleDateString()
  }

  const hasContent = content.trim() || originalPost || poll || selectedGif || selectedMedia || selectedTags.length > 0

  return (
    <div className="min-h-screen bg-background animate-slide-up">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <button onClick={handleCancel} className="text-muted-foreground font-medium">
          cancel
        </button>
        <h1 className="text-xl font-bold">fomo</h1>
        <Button
          onClick={handleSubmit}
          disabled={!hasContent || isSubmitting || content.length > maxLength}
          variant="ghost"
          className="text-pink-600 font-medium disabled:text-muted-foreground"
        >
          post
        </Button>
      </header>

      <div className="p-4">
        {/* User info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 bg-muted">
              <AvatarImage src="/placeholder.svg?height=40&width=40" />
              <AvatarFallback className="text-muted-foreground text-xl">?</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-medium">You</h2>
              <p className="text-muted-foreground text-sm">@you</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`text-muted-foreground ${selectedLocation ? "bg-blue-50 text-blue-600 dark:bg-blue-950/20" : ""}`}
            onClick={() => setShowLocationSelector(true)}
          >
            <MapPin className="w-4 h-4 mr-1" />
            {selectedLocation || "location"}
          </Button>
        </div>

        {/* Quote Repost indicator */}
        {originalPost && (
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Repeat className="w-4 h-4" />
            <span className="text-sm">Quote Repost</span>
          </div>
        )}

        {/* Post content */}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={originalPost ? "Add your comment..." : "whats going on rn??"}
          className="w-full border-none resize-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0 h-40 bg-card text-foreground"
          maxLength={maxLength}
        />

        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                  className="h-4 w-4 p-0 hover:bg-muted"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Selected GIF */}
        {selectedGif && (
          <div className="mt-3 relative inline-block">
            <img src={selectedGif || "/placeholder.svg"} alt="Selected GIF" className="max-w-48 rounded-lg" />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setSelectedGif(null)}
              className="absolute top-1 right-1 h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Selected Media */}
        {selectedMedia && (
          <div className="mt-3 relative inline-block">
            {selectedMedia.type === "image" ? (
              <img
                src={selectedMedia.url || "/placeholder.svg"}
                alt="Selected media"
                className="max-w-full max-h-64 rounded-lg"
              />
            ) : (
              <video src={selectedMedia.url} controls className="max-w-full max-h-64 rounded-lg" />
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setSelectedMedia(null)}
              className="absolute top-1 right-1 h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Poll Preview */}
        {poll && (
          <Card className="mt-3 border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-medium capitalize">{poll.type} Poll</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPoll(null)} className="h-6 w-6 p-0">
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-sm font-medium mb-2">{poll.question}</div>
              {poll.type !== "question" && (
                <div className="space-y-1">
                  {poll.options.map((option) => (
                    <div key={option.id} className="text-xs text-muted-foreground">
                      • {option.text}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Original Post Preview (for quote reposts) */}
        {originalPost && (
          <Card className="mt-4 border border-border">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={originalPost.user.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{originalPost.user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-foreground">{originalPost.user.name}</span>
                    <span className="text-muted-foreground text-xs">@{originalPost.user.username}</span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-muted-foreground text-xs">
                      {originalPost.timestamp instanceof Date
                        ? getRelativeTime(originalPost.timestamp)
                        : getRelativeTime(new Date(originalPost.timestamp))}
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-3">{originalPost.content}</p>

                  {/* Media placeholder for original post */}
                  {originalPost.media && (
                    <div className="bg-muted border border-border rounded-lg p-4 text-center mt-2">
                      <div className="text-muted-foreground text-xs">📷 Original media</div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 flex items-center justify-between pb-safe" style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="sm"
            className={`text-muted-foreground p-2 ${selectedMedia ? "bg-blue-50 text-blue-600 dark:bg-blue-950/20" : ""}`}
            onClick={() => setShowMediaPicker(true)}
          >
            <ImageIcon className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`text-muted-foreground p-2 ${selectedTags.length > 0 ? "bg-blue-50 text-blue-600 dark:bg-blue-950/20" : ""}`}
            onClick={() => setShowPresetTagSelector(true)}
          >
            <Tag className="w-5 h-5" />
          </Button>
          <GifPicker onSelectGif={setSelectedGif} />
          <Button
            variant="ghost"
            size="sm"
            className={`text-muted-foreground p-2 ${poll ? "bg-blue-50 text-blue-600 dark:bg-blue-950/20" : ""}`}
            onClick={() => setShowPollCreator(true)}
          >
            <BarChart3 className="w-5 h-5" />
          </Button>
        </div>
        <div className="text-muted-foreground text-lg">{maxLength - content.length}</div>
      </div>

      {/* Modals */}
      <LocationSelector
        isOpen={showLocationSelector}
        onClose={() => setShowLocationSelector(false)}
        onSelectLocation={setSelectedLocation}
        selectedLocation={selectedLocation}
        partyLocationTags={currentParty?.locationTags}
        partyName={currentParty?.name}
      />

      <PollCreator
        isOpen={showPollCreator}
        onClose={() => setShowPollCreator(false)}
        onCreatePoll={setPoll}
        existingPoll={poll || undefined}
      />

      <PresetTagSelector
        isOpen={showPresetTagSelector}
        onClose={() => setShowPresetTagSelector(false)}
        selectedTags={selectedTags}
        onUpdateTags={setSelectedTags}
      />

      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelectMedia={(url, type) => setSelectedMedia({ url, type })}
        selectedMedia={selectedMedia}
      />
    </div>
  )
}
