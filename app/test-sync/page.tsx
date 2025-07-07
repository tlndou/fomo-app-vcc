"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/auth-context"
import { syncService } from "@/lib/sync-service"
import { ArrowLeft, RefreshCw, Save, User, Users, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"

export default function TestSyncPage() {
  const router = useRouter()
  const { user, updateProfile, syncUserData, forceRefreshUserData } = useAuth()
  const [testName, setTestName] = useState("")
  const [testBio, setTestBio] = useState("")
  const [syncStatus, setSyncStatus] = useState<string>("")
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const handleTestSync = async () => {
    if (!user) return
    
    setSyncStatus("🔄 Testing sync...")
    
    try {
      // Test profile sync
      const success = await syncService.syncUserProfile(user.id, {
        name: testName || user.name,
        bio: testBio || user.bio,
      })
      
      if (success) {
        setSyncStatus("✅ Sync successful! Changes should appear on other devices.")
        
        // Update local state
        if (testName) user.name = testName
        if (testBio) user.bio = testBio
        
        // Force refresh to verify
        setTimeout(async () => {
          await forceRefreshUserData()
          setSyncStatus("✅ Sync verified! Check other devices.")
        }, 2000)
      } else {
        setSyncStatus("❌ Sync failed. Check console for details.")
      }
    } catch (error) {
      console.error('Sync test error:', error)
      setSyncStatus("❌ Sync error. Check console for details.")
    }
  }

  const handleDebugSync = async () => {
    if (!user) return
    
    setSyncStatus("🔍 Debugging sync status...")
    
    try {
      const debugData = await syncService.debugSyncStatus(user.id)
      setDebugInfo(debugData)
      setSyncStatus("✅ Debug complete. Check debug info below.")
    } catch (error) {
      console.error('Debug error:', error)
      setSyncStatus("❌ Debug error. Check console for details.")
    }
  }

  const handleForceRefresh = async () => {
    if (!user) return
    
    setSyncStatus("🔄 Force refreshing...")
    
    try {
      await forceRefreshUserData()
      setSyncStatus("✅ Force refresh complete!")
    } catch (error) {
      console.error('Force refresh error:', error)
      setSyncStatus("❌ Force refresh error. Check console for details.")
    }
  }

  const handleManualSync = async () => {
    if (!user) return
    
    setSyncStatus("🔄 Manual sync...")
    
    try {
      await syncUserData()
      setSyncStatus("✅ Manual sync complete!")
    } catch (error) {
      console.error('Manual sync error:', error)
      setSyncStatus("❌ Manual sync error. Check console for details.")
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">Please log in to test sync functionality.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Cross-Device Sync Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Test Name</label>
                <Input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder={user.name}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Test Bio</label>
                <Textarea
                  value={testBio}
                  onChange={(e) => setTestBio(e.target.value)}
                  placeholder={user.bio || "Enter test bio..."}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleTestSync} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Test Sync
              </Button>
              <Button onClick={handleDebugSync} variant="outline" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Debug Sync
              </Button>
              <Button onClick={handleForceRefresh} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Force Refresh
              </Button>
              <Button onClick={handleManualSync} variant="outline" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Manual Sync
              </Button>
            </div>

            {syncStatus && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">{syncStatus}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {debugInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Current User Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>ID:</strong> {user.id}</div>
              <div><strong>Name:</strong> {user.name}</div>
              <div><strong>Username:</strong> {user.username}</div>
              <div><strong>Bio:</strong> {user.bio || "No bio"}</div>
              <div><strong>Star Sign:</strong> {user.starSign || "Not set"}</div>
              <div><strong>Age:</strong> {user.age || "Not set"}</div>
              <div><strong>Join Date:</strong> {user.joinDate || "Not set"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>1. Test Sync:</strong> Update your profile and sync changes across devices.</p>
            <p><strong>2. Debug Sync:</strong> Check sync status and data sources.</p>
            <p><strong>3. Force Refresh:</strong> Manually refresh user data from all sources.</p>
            <p><strong>4. Manual Sync:</strong> Sync current user data to all storage methods.</p>
            <p className="text-gray-600 mt-4">
              <strong>Note:</strong> Changes should appear on other devices within a few seconds.
              If they don't, try the Force Refresh button.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 