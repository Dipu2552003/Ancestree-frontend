'use client'

import { useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'
import type { Dispatch, SetStateAction } from 'react'
import { api } from '@/lib/api'
import type { PersonData, SavePayload } from '@/types'
import type { RelAction } from '@/components/graph/Navbar'
import { computeCascadeOps } from '@/lib/graph/relationshipRules'

interface NodeActionsReturn {
  onUpdateNode: (id: string, data: Partial<PersonData>) => void
  onSaveNode: (id: string, payload: SavePayload) => Promise<void>
  onDeleteNode: (id: string) => Promise<void>
  onAddRelation: (action: RelAction) => Promise<void>
}

export function useNodeActions(
  edges: Edge[],
  setNodes: Dispatch<SetStateAction<Node[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>,
  fetchGraph: () => Promise<void>,
  selectedNodeId: string | null,
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>,
): NodeActionsReturn {
  const onUpdateNode = useCallback((id: string, data: Partial<PersonData>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
  }, [setNodes])

  const onDeleteNode = useCallback(async (id: string) => {
    await api.persons.delete(id)
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id))
    setSelectedNodeId(null)
  }, [setNodes, setEdges, setSelectedNodeId])

  const onSaveNode = useCallback(async (id: string, payload: SavePayload) => {
    await api.persons.update(id, {
      full_name:       payload.fullName,
      nickname:        payload.nickname ?? null,
      gender:          payload.gender ?? null,
      birth_year:      payload.birthYear ?? null,
      birth_place:     payload.birthPlace ?? null,
      is_alive:        payload.isAlive,
      death_year:      payload.deathYear ?? null,
      photo_url:       payload.photoUrl ?? null,
      gotra:           payload.gotra ?? null,
      native_village:  payload.nativeVillage ?? null,
      current_city:    payload.currentCity ?? null,
      current_country: payload.currentCountry ?? null,
      occupation:      payload.occupation ?? null,
      bio:             payload.bio ?? null,
      education:       payload.education ?? null,
    })
    onUpdateNode(id, {
      fullName:       payload.fullName,
      nickname:       payload.nickname ?? undefined,
      gender:         payload.gender ?? undefined,
      birthYear:      payload.birthYear ?? undefined,
      birthPlace:     payload.birthPlace ?? undefined,
      isAlive:        payload.isAlive,
      isDeceased:     !payload.isAlive,
      deathYear:      payload.deathYear ?? undefined,
      photoUrl:       payload.photoUrl ?? undefined,
      gotra:          payload.gotra ?? undefined,
      nativeVillage:  payload.nativeVillage ?? undefined,
      currentCity:    payload.currentCity ?? undefined,
      currentCountry: payload.currentCountry ?? undefined,
      occupation:     payload.occupation ?? undefined,
      bio:            payload.bio ?? undefined,
      education:      payload.education ?? undefined,
    })
  }, [onUpdateNode])

  const onAddRelation = useCallback(async (action: RelAction) => {
    if (!selectedNodeId) return

    const genderMap: Partial<Record<RelAction, string>> = {
      father: 'male', mother: 'female',
      son: 'male', daughter: 'female',
      brother: 'male', sister: 'female',
    }

    try {
      const person = await api.persons.create({
        full_name: 'Unknown', is_alive: true,
        ...(genderMap[action] ? { gender: genderMap[action] } : {}),
      })

      // All cascade logic (base edge + derived edges) lives in relationshipRules.ts
      const ops = computeCascadeOps(action, selectedNodeId, person.id, edges)
      for (const op of ops) {
        try { await api.relationships.create(op) }
        catch { /* ignore duplicate edges */ }
      }

      await fetchGraph()
      setSelectedNodeId(person.id)
    } catch (err) {
      console.error('Failed to add relation:', err)
    }
  }, [selectedNodeId, edges, fetchGraph, setSelectedNodeId])

  return { onUpdateNode, onSaveNode, onDeleteNode, onAddRelation }
}
