'use client'

import { useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'
import type { Dispatch, SetStateAction } from 'react'
import { api, type PotentialMatch } from '@/lib/api'
import type { PersonData, SavePayload } from '@/types'
import type { RelAction } from '@/components/graph/Navbar'
import { computeCascadeOps } from '@/lib/graph/relationshipRules'

const GENDER_BY_RELATION: Partial<Record<RelAction, string>> = {
  father: 'male', mother: 'female',
  son: 'male', daughter: 'female',
  brother: 'male', sister: 'female',
}

interface NodeActionsReturn {
  onUpdateNode: (id: string, data: Partial<PersonData>) => void
  onSaveNode: (id: string, payload: SavePayload) => Promise<void>
  onDeleteNode: (id: string) => Promise<void>
  onAddRelation: (action: RelAction, fullName: string) => Promise<void>
}

export function useNodeActions(
  edges: Edge[],
  setNodes: Dispatch<SetStateAction<Node[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>,
  fetchGraph: () => Promise<void>,
  selectedNodeId: string | null,
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>,
  onDuplicateFound: (newPersonId: string, matches: PotentialMatch[]) => void,
): NodeActionsReturn {
  const onUpdateNode = useCallback((id: string, data: Partial<PersonData>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
  }, [setNodes])

  const onDeleteNode = useCallback(async (id: string) => {
    await api.persons.delete(id)
    setSelectedNodeId(null)
    await fetchGraph()
  }, [fetchGraph, setSelectedNodeId])

  const onSaveNode = useCallback(async (id: string, payload: SavePayload) => {
    const result = await api.persons.update(id, {
      full_name:        payload.fullName,
      first_name:       payload.firstName ?? null,
      middle_name:      payload.middleName ?? null,
      last_name:        payload.lastName ?? null,
      name_native:      payload.nameNative ?? null,
      nickname:         payload.nickname ?? null,
      gender:           payload.gender ?? null,
      gotra:            payload.gotra ?? null,
      religion:         payload.religion ?? null,
      birth_date:       payload.birthDate ?? null,
      birth_year:       payload.birthYear ?? null,
      birth_place:      payload.birthPlace ?? null,
      is_alive:         payload.isAlive,
      death_date:       payload.deathDate ?? null,
      death_year:       payload.deathYear ?? null,
      death_place:      payload.deathPlace ?? null,
      phone:            payload.phone ?? null,
      whatsapp:         payload.whatsapp ?? null,
      email:            payload.email ?? null,
      current_address:  payload.currentAddress ?? null,
      current_city:     payload.currentCity ?? null,
      current_state:    payload.currentState ?? null,
      current_country:  payload.currentCountry ?? null,
      current_pincode:  payload.currentPincode ?? null,
      native_village:   payload.nativeVillage ?? null,
      native_tehsil:    payload.nativeTehsil ?? null,
      native_district:  payload.nativeDistrict ?? null,
      native_state:     payload.nativeState ?? null,
      native_country:   payload.nativeCountry ?? null,
      occupation:       payload.occupation ?? null,
      occupation_detail: payload.occupationDetail ?? null,
      education:        payload.education ?? null,
      bio:              payload.bio ?? null,
      photo_url:        payload.photoUrl ?? null,
    })
    onUpdateNode(id, {
      fullName:         payload.fullName,
      firstName:        payload.firstName ?? undefined,
      middleName:       payload.middleName ?? undefined,
      lastName:         payload.lastName ?? undefined,
      nameNative:       payload.nameNative ?? undefined,
      nickname:         payload.nickname ?? undefined,
      gender:           payload.gender ?? undefined,
      gotra:            payload.gotra ?? undefined,
      religion:         payload.religion ?? undefined,
      birthDate:        payload.birthDate ?? undefined,
      birthYear:        payload.birthYear ?? undefined,
      birthPlace:       payload.birthPlace ?? undefined,
      isAlive:          payload.isAlive,
      isDeceased:       !payload.isAlive,
      deathDate:        payload.deathDate ?? undefined,
      deathYear:        payload.deathYear ?? undefined,
      deathPlace:       payload.deathPlace ?? undefined,
      phone:            payload.phone ?? undefined,
      whatsapp:         payload.whatsapp ?? undefined,
      email:            payload.email ?? undefined,
      currentAddress:   payload.currentAddress ?? undefined,
      currentCity:      payload.currentCity ?? undefined,
      currentState:     payload.currentState ?? undefined,
      currentCountry:   payload.currentCountry ?? undefined,
      currentPincode:   payload.currentPincode ?? undefined,
      nativeVillage:    payload.nativeVillage ?? undefined,
      nativeTehsil:     payload.nativeTehsil ?? undefined,
      nativeDistrict:   payload.nativeDistrict ?? undefined,
      nativeState:      payload.nativeState ?? undefined,
      nativeCountry:    payload.nativeCountry ?? undefined,
      occupation:       payload.occupation ?? undefined,
      occupationDetail: payload.occupationDetail ?? undefined,
      education:        payload.education ?? undefined,
      bio:              payload.bio ?? undefined,
      photoUrl:         payload.photoUrl ?? undefined,
    })
    // If the name was changed to a real value and the backend found matches,
    // show the duplicate-found modal immediately after save.
    if (result.potential_matches && result.potential_matches.length > 0) {
      onDuplicateFound(id, result.potential_matches)
    }
  }, [onUpdateNode, onDuplicateFound])

  const onAddRelation = useCallback(async (action: RelAction, fullName: string) => {
    if (!selectedNodeId) return

    try {
      const person = await api.persons.create({
        full_name: fullName.trim() || 'Unknown', is_alive: true,
        ...(GENDER_BY_RELATION[action] ? { gender: GENDER_BY_RELATION[action] } : {}),
      })

      // All cascade logic (base edge + derived edges) lives in relationshipRules.ts
      const ops = computeCascadeOps(action, selectedNodeId, person.id, edges)
      for (const op of ops) {
        try { await api.relationships.create(op) }
        catch { /* ignore duplicate edges */ }
      }

      await fetchGraph()
      setSelectedNodeId(person.id)

      // Notify page if the backend found potential duplicates
      if (person.potential_matches && person.potential_matches.length > 0) {
        onDuplicateFound(person.id, person.potential_matches)
      }
    } catch (err) {
      console.error('Failed to add relation:', err)
    }
  }, [selectedNodeId, edges, fetchGraph, setSelectedNodeId, onDuplicateFound])

  return { onUpdateNode, onSaveNode, onDeleteNode, onAddRelation }
}
