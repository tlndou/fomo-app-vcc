import { supabase } from './supabase'
import type { User } from '@/types/feed'
import type { Party } from '@/types/party'

// Sync service for cross-device data synchronization
export const syncService = {
  // User profile synchronization
  async syncUserProfile(userId: string, userData: Partial<User>) {
    try {
      console.log('🔄 Syncing user profile:', { userId, userData })
      
      // Update Supabase user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          name: userData.name,
          username: userData.username,
          bio: userData.bio,
          starSign: userData.starSign,
          joinDate: userData.joinDate,
          age: userData.age,
          avatar: userData.avatar,
        }
      })
      
      if (metadataError) {
        console.error('❌ Error updating user metadata:', metadataError)
      }
      
      // Update profiles table if it exists
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            full_name: userData.name,
            username: userData.username,
            bio: userData.bio,
            avatar_url: userData.avatar,
            star_sign: userData.starSign,
            age: userData.age,
            updated_at: new Date().toISOString()
          })
        
        if (profileError) {
          console.warn('⚠️ Profiles table not available, using metadata only')
        }
      } catch (error) {
        console.warn('⚠️ Profiles table not available, using metadata only')
      }
      
      // Update localStorage for immediate access
      const storedUsers = localStorage.getItem('fomo-users')
      const users = storedUsers ? JSON.parse(storedUsers) : {}
      users[userId] = {
        ...users[userId],
        ...userData,
        id: userId,
      }
      localStorage.setItem('fomo-users', JSON.stringify(users))
      
      console.log('✅ User profile synced successfully')
      return true
    } catch (error) {
      console.error('❌ Error syncing user profile:', error)
      return false
    }
  },

  // Get user profile with fallback sources
  async getUserProfile(userId: string): Promise<User | null> {
    try {
      console.log('🔍 Getting user profile for:', userId)
      
      // Try to get from Supabase profiles table first
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (!error && profile) {
          console.log('✅ Found user profile in Supabase:', profile)
          return {
            id: profile.id,
            name: profile.full_name,
            username: profile.username,
            avatar: profile.avatar_url,
            bio: profile.bio,
            starSign: profile.star_sign,
            age: profile.age,
            joinDate: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : undefined,
            friendStatus: 'none' as const,
          }
        }
      } catch (error) {
        console.warn('⚠️ Profiles table not available')
      }
      
      // Try to get from user metadata
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.id === userId) {
        console.log('✅ Found user in auth metadata:', user.user_metadata)
        return {
          id: user.id,
          name: user.user_metadata?.name || 'User',
          username: user.user_metadata?.username || 'user',
          avatar: user.user_metadata?.avatar_url,
          bio: user.user_metadata?.bio,
          starSign: user.user_metadata?.starSign,
          age: user.user_metadata?.age,
          joinDate: user.user_metadata?.joinDate,
          friendStatus: 'self' as const,
        }
      }
      
      // Fallback to localStorage
      const storedUsers = localStorage.getItem('fomo-users')
      const users = storedUsers ? JSON.parse(storedUsers) : {}
      const storedUser = users[userId]
      
      if (storedUser) {
        console.log('✅ Found user in localStorage:', storedUser)
        return {
          id: storedUser.id,
          name: storedUser.name,
          username: storedUser.username,
          avatar: storedUser.avatar,
          bio: storedUser.bio,
          starSign: storedUser.starSign,
          age: storedUser.age,
          joinDate: storedUser.joinDate,
          friendStatus: 'none' as const,
        }
      }
      
      console.log('❌ User profile not found')
      return null
    } catch (error) {
      console.error('❌ Error getting user profile:', error)
      return null
    }
  },

  // Party synchronization
  async syncParty(party: Party) {
    try {
      console.log('🔄 Syncing party:', party.id)
      
      const { error } = await supabase
        .from('parties')
        .upsert({
          id: party.id,
          name: party.name,
          date: party.date,
          time: party.time,
          location: party.location,
          description: party.description,
          hosts: party.hosts,
          status: party.status,
          attendees: party.attendees,
          location_tags: party.locationTags,
          user_tags: party.userTags,
          co_hosts: party.coHosts,
          require_approval: party.requireApproval,
          invites: party.invites,
          updated_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('❌ Error syncing party:', error)
        return false
      }
      
      console.log('✅ Party synced successfully')
      return true
    } catch (error) {
      console.error('❌ Error syncing party:', error)
      return false
    }
  },

  // Get all parties for a user with proper filtering
  async getUserParties(userId: string): Promise<Party[]> {
    try {
      console.log('🔍 Getting parties for user:', userId)
      
      // Get user profile to get the name for filtering
      const userProfile = await this.getUserProfile(userId)
      const userName = userProfile?.name || userId
      
      console.log('🔍 Filtering parties by user name:', userName)
      
      const { data: parties, error } = await supabase
        .from('parties')
        .select('*')
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ Error fetching parties:', error)
        return []
      }
      
      // Filter parties where the user is a host (by name)
      const userParties = (parties || []).filter(party => {
        const hosts = party.hosts || []
        return hosts.some((host: string) => host === userName)
      })
      
      console.log('✅ Found user parties:', userParties.length)
      
      // Convert to frontend format
      return userParties.map(party => ({
        ...party,
        locationTags: party.location_tags,
        userTags: party.user_tags,
        coHosts: party.co_hosts,
        requireApproval: party.require_approval,
        createdAt: party.created_at,
        updatedAt: party.updated_at
      }))
    } catch (error) {
      console.error('❌ Error getting user parties:', error)
      return []
    }
  },

  // Subscribe to real-time updates
  subscribeToUserUpdates(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`user-${userId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, 
        callback
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'parties' }, 
        callback
      )
      .subscribe()
  },

  // Force refresh all data for a user
  async forceRefreshUserData(userId: string) {
    try {
      console.log('🔄 Force refreshing user data for:', userId)
      
      // Refresh user profile
      const userProfile = await this.getUserProfile(userId)
      
      // Refresh parties
      const parties = await this.getUserParties(userId)
      
      console.log('✅ Force refresh completed')
      return { userProfile, parties }
    } catch (error) {
      console.error('❌ Error force refreshing user data:', error)
      return { userProfile: null, parties: [] }
    }
  },

  // Debug function to check sync status
  async debugSyncStatus(userId: string) {
    try {
      console.log('🔍 Debugging sync status for user:', userId)
      
      // Check Supabase profiles table
      let supabaseProfile = null
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (!error && data) {
          supabaseProfile = data
        }
      } catch (error) {
        console.log('⚠️ Profiles table not available')
      }
      
      // Check user metadata
      const { data: { user } } = await supabase.auth.getUser()
      const userMetadata = user?.user_metadata
      
      // Check localStorage
      const storedUsers = localStorage.getItem('fomo-users')
      const users = storedUsers ? JSON.parse(storedUsers) : {}
      const localStorageUser = users[userId]
      
      console.log('🔍 Sync status debug:', {
        supabaseProfile,
        userMetadata,
        localStorageUser,
        hasUser: !!user,
        userId
      })
      
      return {
        supabaseProfile,
        userMetadata,
        localStorageUser,
        hasUser: !!user,
        userId
      }
    } catch (error) {
      console.error('❌ Error debugging sync status:', error)
      return null
    }
  }
}

// Make debug function available globally
if (typeof window !== 'undefined') {
  (window as any).debugSyncStatus = syncService.debugSyncStatus
  ;(window as any).forceRefreshUserData = syncService.forceRefreshUserData
} 