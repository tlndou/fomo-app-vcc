"use client"
import { Megaphone, Calendar, MapPin, Users, X } from "lucide-react"
import { PostItem } from "./post-item"
import type { Post, User } from "@/types/feed"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface AnnouncementsTabProps {
  posts: Post[]
  currentUser: User
  users: User[]
  onReact: (postId: string, emoji: string) => void
  onComment: (postId: string, content: string, parentId?: string, gifUrl?: string) => void
  onLocationClick: (location: string) => void
  onTagClick: (tag: string) => void
  onHashtagClick: (hashtag: string) => void
  onUserClick: (userId: string) => void
  onSendFriendRequest: (userId: string) => void
  onSharePost: (postId: string, userId: string, message?: string) => void
  onDeletePost: (postId: string) => void
  onDeleteComment: (postId: string, commentId: string) => void
  onPartyCancelled?: (partyId: string, partyName: string, cancelledBy: string) => void
}

export function AnnouncementsTab({
  posts,
  currentUser,
  users,
  onReact,
  onComment,
  onLocationClick,
  onTagClick,
  onHashtagClick,
  onUserClick,
  onSendFriendRequest,
  onSharePost,
  onDeletePost,
  onDeleteComment,
  onPartyCancelled,
}: AnnouncementsTabProps) {
  const announcementPosts = posts.filter((post) => post.user.isHost)
  const [activeSubTab, setActiveSubTab] = useState<"announcements" | "details">("announcements")
  const { toast } = useToast()

  // Mock party data - in a real app, this would come from props or context
  const partyData = {
    id: "1",
    name: "Sarah's Birthday Bash",
    date: "Saturday, January 20, 2024",
    time: "7:00 PM",
    location: "The Rooftop Bar, 123 Main St, Downtown",
    attendees: 23,
    maxAttendees: 50,
    hosts: ["Sarah Chen", "Mike Rodriguez", "Alex Kim"],
    status: "live" as const,
    description: "Join us for a night of celebration, music, and fun!"
  }

  // Check if current user is a host
  const isHost = partyData.hosts.some(host => 
    host.toLowerCase().includes(currentUser.name.toLowerCase()) || 
    currentUser.name.toLowerCase().includes(host.toLowerCase())
  )

  const handleCancelParty = () => {
    // In a real app, you would update the party status in the database
    // and send notifications to all attendees
    
    console.log("Party cancelled:", partyData.id)

    if (onPartyCancelled) {
      onPartyCancelled(partyData.id, partyData.name, currentUser.name)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Live Now</Badge>
      case "upcoming":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Upcoming</Badge>
      case "completed":
        return <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600 text-white">Completed</Badge>
      case "cancelled":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Cancelled</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Content */}
      <div className="px-4"></div>
      {/* Sub-tab Navigation */}
      <div className="bg-card p-4 border-b border-border">
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          <Button
            variant={activeSubTab === "announcements" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveSubTab("announcements")}
            className="flex items-center gap-1"
          >
            <Megaphone className="w-3 h-3" />
            Announcements
          </Button>
          <Button
            variant={activeSubTab === "details" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveSubTab("details")}
            className="flex items-center gap-1"
          >
            <Calendar className="w-3 h-3" />
            Party Details
          </Button>
        </div>
      </div>
      {activeSubTab === "details" ? (
        <div className="px-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold">Party Information</h2>
                {getStatusBadge(partyData.status)}
              </div>
              
              {partyData.description && (
                <p className="text-muted-foreground mb-6">{partyData.description}</p>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-medium">Date & Time</div>
                    <div className="text-muted-foreground">{partyData.date} at {partyData.time}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-medium">Location</div>
                    <div className="text-muted-foreground">{partyData.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-medium">Attendees</div>
                    <div className="text-muted-foreground">{partyData.attendees} going, {partyData.maxAttendees - partyData.attendees} spots left</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Hosted by</div>
                    <div className="text-muted-foreground">{partyData.hosts.join(", ")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Friends Attending</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex -space-x-2">
                        {users
                          .filter((user) => user.friendStatus === "friends")
                          .slice(0, 5)
                          .map((friend) => (
                            <button key={friend.id} onClick={() => onUserClick(friend.id)} className="relative">
                              <img
                                src={friend.avatar || "/placeholder.svg"}
                                alt={friend.name}
                                className="w-8 h-8 rounded-full border-2 border-white hover:scale-110 transition-transform"
                              />
                            </button>
                          ))}
                        {users.filter((user) => user.friendStatus === "friends").length > 5 && (
                          <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                            +{users.filter((user) => user.friendStatus === "friends").length - 5}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground ml-2">
                        {users.filter((user) => user.friendStatus === "friends").length === 0
                          ? "None of your friends are attending yet"
                          : `${users.filter((user) => user.friendStatus === "friends").length} friend${users.filter((user) => user.friendStatus === "friends").length !== 1 ? "s" : ""} attending`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Host Actions */}
                {isHost && partyData.status === "live" && (
                  <div className="pt-4 border-t">
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1">
                        Edit Party
                      </Button>
                      
                      {/* Cancel Party Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="flex-1">
                            <X className="w-4 h-4 mr-2" />
                            Cancel Party
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Party</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel "{partyData.name}"? This action cannot be undone and all attendees will be notified.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Party</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleCancelParty}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Cancel Party
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="px-4">
          <div className="space-y-4">
            {announcementPosts.length === 0 ? (
              <div className="text-center text-muted-foreground mt-8">
                <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">No announcements yet</h3>
                <p className="text-sm">The party host hasn't made any announcements</p>
              </div>
            ) : (
              announcementPosts
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .map((post) => (
                  <PostItem
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    onReact={onReact}
                    onComment={onComment}
                    onLocationClick={onLocationClick}
                    onTagClick={onTagClick}
                    onHashtagClick={onHashtagClick}
                    onUserClick={onUserClick}
                    onSendFriendRequest={onSendFriendRequest}
                    onSharePost={onSharePost}
                    onDeletePost={onDeletePost}
                    onDeleteComment={onDeleteComment}
                    users={users}
                  />
                ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
