"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"
import { syncService } from "@/lib/sync-service"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, TestTube } from "lucide-react"
import { useRouter } from "next/navigation"

export default function TestSyncSimplePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [testName, setTestName] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  const testSyncService = async () => {
    if (!user) return
    
    setLoading(true)
    setStatus("🔄 Testing sync service...")
    
    try {
      // Test basic sync
      const success = await syncService.syncUserProfile(user.id, {
        name: testName || user.name,
        bio: "Test bio from sync service",
      })
      
      if (success) {
        setStatus("✅ Sync service working! Check console for details.")
        console.log('✅ Sync service test successful')
      } else {
        setStatus("❌ Sync service failed. Check console for details.")
        console.error('❌ Sync service test failed')
      }
    } catch (error) {
      console.error('❌ Sync service error:', error)
      setStatus("❌ Sync service error. Check console for details.")
    }
    
    setLoading(false)
  }

  const testDirectUpdate = async () => {
    if (!user) return
    
    setLoading(true)
    setStatus("🔄 Testing direct update...")
    
    try {
      // Test direct Supabase update
      const { error } = await supabase.auth.updateUser({
        data: {
          name: testName || user.name,
          bio: "Test bio from direct update",
        }
      })
      
      if (error) {
        console.error('❌ Direct update error:', error)
        setStatus("❌ Direct update failed. Check console for details.")
      } else {
        console.log('✅ Direct update successful')
        setStatus("✅ Direct update working! Check console for details.")
      }
    } catch (error) {
      console.error('❌ Direct update error:', error)
      setStatus("❌ Direct update error. Check console for details.")
    }
    
    setLoading(false)
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
              <TestTube className="w-5 h-5" />
              Simple Sync Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Test Name</label>
              <Input
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder={user.name}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={testSyncService} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                Test Sync Service
              </Button>
              <Button 
                onClick={testDirectUpdate} 
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                Test Direct Update
              </Button>
            </div>

            {status && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">{status}</p>
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p><strong>Current User:</strong> {user.name}</p>
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Bio:</strong> {user.bio || "No bio"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 