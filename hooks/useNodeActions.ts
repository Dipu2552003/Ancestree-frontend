'use client'

import { useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'
import type { Dispatch, SetStateAction } from 'react'
import { api } from '@/lib/api'
import type { PersonData, SavePayload, EdgeData } from '@/types'
import type { RelAction } from '@/components/graph/Navbar'

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
    const relMap: Record<RelAction, 'PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF'> = {
      father: 'PARENT_OF', mother: 'PARENT_OF',
      son: 'PARENT_OF', daughter: 'PARENT_OF',
      brother: 'SIBLING_OF', sister: 'SIBLING_OF',
      spouse: 'SPOUSE_OF',
    }
    const gender = genderMap[action]
    const isParentOfChild = action === 'son' || action === 'daughter'
    const isParent = action === 'father' || action === 'mother'

    try {
      const person = await api.persons.create({
        full_name: 'Unknown', is_alive: true, ...(gender ? { gender } : {}),
      })

      await api.relationships.create({
        from_person_id: isParentOfChild ? selectedNodeId : person.id,
        to_person_id:   isParentOfChild ? person.id : selectedNodeId,
        rel_type: relMap[action],
      })

      if (isParent) {
        const existingParents = edges
          .filter(e => e.target === selectedNodeId && (e.data as unknown as EdgeData)?.relType === 'PARENT_OF')
          .map(e => e.source)
        for (const parentId of existingParents) {
          try { await api.relationships.create({ from_person_id: person.id, to_person_id: parentId, rel_type: 'SPOUSE_OF' }) }
          catch { /* ignore duplicate */ }
        }

        const siblings = edges
          .filter(e => (e.data as unknown as EdgeData)?.relType === 'SIBLING_OF' && (e.source === selectedNodeId || e.target === selectedNodeId))
          .map(e => e.source === selectedNodeId ? e.target : e.source)
        for (const siblingId of siblings) {
          try { await api.relationships.create({ from_person_id: person.id, to_person_id: siblingId, rel_type: 'PARENT_OF' }) }
          catch { /* ignore duplicate */ }
        }
      }

      if (isParentOfChild) {
        const spouses = edges
          .filter(e => (e.data as unknown as EdgeData)?.relType === 'SPOUSE_OF' && (e.source === selectedNodeId || e.target === selectedNodeId))
          .map(e => e.source === selectedNodeId ? e.target : e.source)
        for (const spouseId of spouses) {
          try { await api.relationships.create({ from_person_id: spouseId, to_person_id: person.id, rel_type: 'PARENT_OF' }) }
          catch { /* ignore duplicate */ }
        }
      }

      if (action === 'spouse') {
        const existingChildren = edges
          .filter(e => e.source === selectedNodeId && (e.data as unknown as EdgeData)?.relType === 'PARENT_OF')
          .map(e => e.target)
        for (const childId of existingChildren) {
          try { await api.relationships.create({ from_person_id: person.id, to_person_id: childId, rel_type: 'PARENT_OF' }) }
          catch { /* ignore duplicate */ }
        }
      }

      if (action === 'brother' || action === 'sister') {
        const existingParents = edges
          .filter(e => e.target === selectedNodeId && (e.data as unknown as EdgeData)?.relType === 'PARENT_OF')
          .map(e => e.source)
        for (const parentId of existingParents) {
          try { await api.relationships.create({ from_person_id: parentId, to_person_id: person.id, rel_type: 'PARENT_OF' }) }
          catch { /* ignore duplicate */ }
        }
      }

      await fetchGraph()
      setSelectedNodeId(person.id)
    } catch (err) {
      console.error('Failed to add relation:', err)
    }
  }, [selectedNodeId, edges, fetchGraph, setSelectedNodeId])

  return { onUpdateNode, onSaveNode, onDeleteNode, onAddRelation }
}
