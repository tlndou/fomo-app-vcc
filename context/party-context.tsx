"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Party, Invite, CoHost, LocationTag, UserTag } from '@/types/party'

interface PartyContextType {
  parties: Party[]
  drafts: Party[]
  addParty: (party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateParty: (id: string, updates: Partial<Party>) => void
  deleteParty: (id: string) => void
  saveDraft: (draft: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateDraft: (id: string, updates: Partial<Party>) => void
  deleteDraft: (id: string) => void
  publishDraft: (id: string) => void
  getPartyById: (id: string) => Party | undefined
  getDraftById: (id: string) => Party | undefined
  completeParty: (id: string) => void
}

const PartyContext = createContext<PartyContextType | undefined>(undefined)

export function useParties() {
  const context = useContext(PartyContext)
  if (context === undefined) {
    throw new Error('useParties must be used within a PartyProvider')
  }
  return context
}

interface PartyProviderProps {
  children: ReactNode
}

export function PartyProvider({ children }: PartyProviderProps) {
  const [parties, setParties] = useState<Party[]>([])
  const [drafts, setDrafts] = useState<Party[]>([])

  // Load parties and drafts from localStorage on mount
  useEffect(() => {
    const storedParties = localStorage.getItem('fomo-parties')
    const storedDrafts = localStorage.getItem('fomo-drafts')
    
    if (storedParties) {
      try {
        setParties(JSON.parse(storedParties))
      } catch (error) {
        console.error('Failed to parse stored parties:', error)
      }
    }
    
    if (storedDrafts) {
      try {
        setDrafts(JSON.parse(storedDrafts))
      } catch (error) {
        console.error('Failed to parse stored drafts:', error)
      }
    }
  }, [])

  // Save parties and drafts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('fomo-parties', JSON.stringify(parties))
  }, [parties])

  useEffect(() => {
    localStorage.setItem('fomo-drafts', JSON.stringify(drafts))
  }, [drafts])

  // Update party status based on start date
  useEffect(() => {
    const updatePartyStatus = () => {
      const now = new Date()
      const updatedParties = parties.map(party => {
        const startDate = new Date(`${party.date} ${party.time}`)
        if (party.status === 'upcoming' && now >= startDate) {
          return { ...party, status: 'live' as const }
        }
        return party
      })
      
      if (JSON.stringify(updatedParties) !== JSON.stringify(parties)) {
        setParties(updatedParties)
        localStorage.setItem('fomo-parties', JSON.stringify(updatedParties))
      }
    }

    updatePartyStatus()
    
    // Check every minute for status updates
    const interval = setInterval(updatePartyStatus, 60000)
    
    return () => clearInterval(interval)
  }, [parties])

  const addParty = (partyData: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const newParty: Party = {
      ...partyData,
      id: `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    }
    
    setParties(prev => [newParty, ...prev])
    
    // Automatically add the creator as an attendee
    if (partyData.hosts.length > 0) {
      const creatorInvite: Invite = {
        id: `invite_${Date.now()}`,
        email: 'creator@example.com', // In a real app, this would be the actual user's email
        status: 'approved',
        name: partyData.hosts[0], // Use the first host as the creator
      }
      
      newParty.invites = newParty.invites || []
      newParty.invites.push(creatorInvite)
    }
  }

  const updateParty = (id: string, updates: Partial<Party>) => {
    setParties(prev => prev.map(party => 
      party.id === id 
        ? { ...party, ...updates, updatedAt: new Date().toISOString() }
        : party
    ))
  }

  const deleteParty = (id: string) => {
    setParties(prev => prev.filter(party => party.id !== id))
  }

  const saveDraft = (draftData: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const newDraft: Party = {
      ...draftData,
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    }
    
    setDrafts(prev => [newDraft, ...prev])
  }

  const updateDraft = (id: string, updates: Partial<Party>) => {
    setDrafts(prev => prev.map(draft => 
      draft.id === id 
        ? { ...draft, ...updates, updatedAt: new Date().toISOString() }
        : draft
    ))
  }

  const deleteDraft = (id: string) => {
    setDrafts(prev => prev.filter(draft => draft.id !== id))
  }

  const publishDraft = (id: string) => {
    const draft = drafts.find(d => d.id === id)
    if (draft) {
      // Remove draft status and add to parties
      const publishedParty: Party = {
        ...draft,
        status: 'upcoming' as const,
        updatedAt: new Date().toISOString(),
      }
      
      setParties(prev => [publishedParty, ...prev])
      setDrafts(prev => prev.filter(d => d.id !== id))
    }
  }

  const getPartyById = (id: string) => {
    return parties.find(party => party.id === id)
  }

  const getDraftById = (id: string) => {
    return drafts.find(draft => draft.id === id)
  }

  const completeParty = (id: string) => {
    const party = parties.find(p => p.id === id)
    if (!party || party.status !== 'live') return

    // Mark party as completed
    updateParty(id, { status: 'completed' })

    // Update user stats for hosts and attendees
    const hosts = party.hosts
    const attendees = party.invites?.map(invite => invite.name) || []

    // Get current user stats from localStorage
    const userStatsData = localStorage.getItem('fomo-user-stats')
    const userStats = userStatsData ? JSON.parse(userStatsData) : {}

    // Update stats for hosts
    hosts.forEach(hostName => {
      if (!userStats[hostName]) {
        userStats[hostName] = { hostedParties: 0, attendedParties: 0, friendCount: 0 }
      }
      userStats[hostName].hostedParties += 1
    })

    // Update stats for attendees (but not hosts to avoid double counting)
    attendees.forEach(attendeeName => {
      if (!hosts.includes(attendeeName)) {
        if (!userStats[attendeeName]) {
          userStats[attendeeName] = { hostedParties: 0, attendedParties: 0, friendCount: 0 }
        }
        userStats[attendeeName].attendedParties += 1
      }
    })

    // Save updated stats
    localStorage.setItem('fomo-user-stats', JSON.stringify(userStats))
  }

  const value: PartyContextType = {
    parties,
    drafts,
    addParty,
    updateParty,
    deleteParty,
    saveDraft,
    updateDraft,
    deleteDraft,
    publishDraft,
    getPartyById,
    getDraftById,
    completeParty,
  }

  return (
    <PartyContext.Provider value={value}>
      {children}
    </PartyContext.Provider>
  )
} 