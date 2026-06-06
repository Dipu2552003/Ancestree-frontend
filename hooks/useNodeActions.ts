'use client'

import { useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'
import type { Dispatch, SetStateAction } from 'react'
import { api, type PotentialMatch } from '@/lib/api'
import type { PersonData, SavePayload, MyPersonInfo } from '@/types'
import type { RelAction } from '@/components/graph/Navbar'
import { computeCascadeOps } from '@/lib/graph/relationshipRules'

const GENDER_BY_RELATION: Partial<Record<RelAction, string>> = {
  father: 'male', mother: 'female',
  son: 'male', daughter: 'female',
  brother: 'male', sister: 'female',
}

export interface AddExtras {
  gender?:         string
  birthYear?:      number
  photoUrl?:       string
  // Spouse-only — marriage step
  marriageStatus?: 'married' | 'partner' | 'divorced' | 'widowed' | 'separated' | 'annulled' | 'unknown'
  unionYear?:      number
  separationYear?: number
  // Son/daughter-only — adoption + mother choice + optional bio parents
  adoptionStatus?: 'biological' | 'adopted'
  motherChoice?:   string | 'unknown' | null
  bioMotherName?:  string
  bioFatherName?:  string
}

interface NodeActionsReturn {
  onUpdateNode: (id: string, data: Partial<PersonData>) => void
  onSaveNode: (id: string, payload: SavePayload) => Promise<void>
  onDeleteNode: (id: string) => Promise<void>
  onAddRelation: (action: RelAction, fullName: string, extras?: AddExtras) => Promise<void>
}

export function useNodeActions(
  edges: Edge[],
  setNodes: Dispatch<SetStateAction<Node[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>,
  fetchGraph: () => Promise<void>,
  selectedNodeId: string | null,
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>,
  onDuplicateFound: (newPersonId: string, matches: PotentialMatch[], myInfo: MyPersonInfo) => void,
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
    if (result.potential_matches && result.potential_matches.length > 0) {
      onDuplicateFound(id, result.potential_matches, {
        fullName:      payload.fullName,
        gender:        payload.gender ?? null,
        birthYear:     payload.birthYear ?? null,
        nativeVillage: payload.nativeVillage ?? null,
        gotra:         payload.gotra ?? null,
        photoUrl:      payload.photoUrl ?? null,
      })
    }
  }, [onUpdateNode, onDuplicateFound])

  const onAddRelation = useCallback(async (action: RelAction, fullName: string, extras?: AddExtras) => {
    if (!selectedNodeId) return

    try {
      const person = await api.persons.create({
        full_name:  fullName.trim() || 'Unknown',
        is_alive:   true,
        gender:     extras?.gender ?? GENDER_BY_RELATION[action] ?? undefined,
        birth_year: extras?.birthYear,
      })

      // photo_url is not accepted on create — patch it immediately after
      if (extras?.photoUrl) {
        try { await api.persons.update(person.id, { photo_url: extras.photoUrl }) }
        catch { /* non-critical: node is created, photo can be added later */ }
      }

      // All cascade logic (base edge + derived edges) lives in relationshipRules.ts.
      // For an "Add spouse" action, decorate the base SPOUSE_OF op with the
      // marriage metadata so it lands on that single edge (not the cascades).
      const ops = computeCascadeOps(action, selectedNodeId, person.id, edges)
      const isChildAdd        = action === 'son'     || action === 'daughter'
      const isSiblingAdd      = action === 'brother' || action === 'sister'
      const needsParentChoice = isChildAdd || isSiblingAdd
      const adoptionSub = extras?.adoptionStatus === 'adopted' ? 'adopted' : 'biological'

      for (const op of ops) {
        const isBaseSpouseEdge =
          action === 'spouse' &&
          op.rel_type === 'SPOUSE_OF' &&
          op.from_person_id === person.id &&
          op.to_person_id === selectedNodeId
        // For child & sibling adds, set sub_type on every PARENT_OF op so the
        // cascaded parents share the adoption status of the new person.
        const isParentEdgeForChildOrSibling = needsParentChoice && op.rel_type === 'PARENT_OF'
        const payload = isBaseSpouseEdge ? {
          ...op,
          sub_type:        extras?.marriageStatus,
          union_year:      extras?.unionYear,
          separation_year: extras?.separationYear,
        } : isParentEdgeForChildOrSibling ? {
          ...op,
          sub_type: adoptionSub,
        } : op
        try { await api.relationships.create(payload) }
        catch { /* ignore duplicate edges */ }
      }

      // ── Multi-spouse case: wizard passes explicit motherChoice ───────────────
      // For son/daughter: chosen wife → new child.
      // For brother/sister: chosen wife → new sibling (the wife is one of the
      //   shared father's spouses; full vs half sibling is determined here).
      if (needsParentChoice && extras?.motherChoice && extras.motherChoice !== 'unknown') {
        try {
          await api.relationships.create({
            from_person_id: extras.motherChoice,
            to_person_id:   person.id,
            rel_type:       'PARENT_OF',
            sub_type:       adoptionSub,
          })
        } catch { /* duplicate ok */ }
      }

      // ── Adopted child / sibling: persist bio-parent names on the person ────
      // Names only — no proxy nodes — so the family tree stays clean. Promote
      // to real person records later if needed.
      if (needsParentChoice && extras?.adoptionStatus === 'adopted') {
        const bioMomName = extras.bioMotherName?.trim()
        const bioDadName = extras.bioFatherName?.trim()
        if (bioMomName || bioDadName) {
          try {
            await api.persons.update(person.id, {
              bio_mother_name: bioMomName || null,
              bio_father_name: bioDadName || null,
            })
          } catch { /* non-fatal */ }
        }
      }

      await fetchGraph()
      setSelectedNodeId(person.id)

      if (person.potential_matches && person.potential_matches.length > 0) {
        onDuplicateFound(person.id, person.potential_matches, {
          fullName: fullName.trim() || 'Unknown',
          gender:   GENDER_BY_RELATION[action] ?? null,
        })
      }
    } catch (err) {
      console.error('Failed to add relation:', err)
    }
  }, [selectedNodeId, edges, fetchGraph, setSelectedNodeId, onDuplicateFound])

  return { onUpdateNode, onSaveNode, onDeleteNode, onAddRelation }
}
