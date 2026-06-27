'use client'

import { useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'
import type { Dispatch, SetStateAction } from 'react'
import { api, type PotentialMatch, type SameTreeMatch } from '@/lib/api'
import type { PersonData, SavePayload, MyPersonInfo, EdgeData } from '@/types'
import type { RelAction } from '@/components/graph/Navbar'
import { computeCascadeOps } from '@/lib/graph/relationshipRules'
import { isGhostNodeId, realIdFromGhost } from '@/lib/graph/ghostNodes'
import { titleCase } from '@/lib/format/normalize'

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
  // When true, suppress the auto post-create duplicate/same-tree modals. The
  // add-node wizard sets this once the user has passed its review step, where
  // the duplicate search is now handled inline and opt-in.
  skipDuplicateCheck?: boolean
}

interface NodeActionsReturn {
  onUpdateNode: (id: string, data: Partial<PersonData>) => void
  onSaveNode: (id: string, payload: SavePayload) => Promise<void>
  onDeleteNode: (id: string) => Promise<void>
  onAddRelation: (action: RelAction, fullName: string, extras?: AddExtras) => Promise<string | null>
}

export function useNodeActions(
  nodes: Node[],
  edges: Edge[],
  setNodes: Dispatch<SetStateAction<Node[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>,
  fetchGraph: () => Promise<void>,
  selectedNodeId: string | null,
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>,
  onDuplicateFound: (newPersonId: string, matches: PotentialMatch[], myInfo: MyPersonInfo) => void,
  onSameTreeDuplicate: (newPersonId: string, newPersonName: string, matches: SameTreeMatch[]) => void,
  updateRawNode: (id: string, data: Partial<PersonData>) => void,
): NodeActionsReturn {
  // Ghosts (intra-family-marriage duplicates) live only in the render layer
  // but share the underlying person row. API calls must always target the real
  // person id; local state updates must reach both the ghost and real copies.
  const toRealId = (id: string) => isGhostNodeId(id) ? realIdFromGhost(id) : id

  const onUpdateNode = useCallback((id: string, data: Partial<PersonData>) => {
    const realId = toRealId(id)
    setNodes(prev => prev.map(n =>
      toRealId(n.id) === realId ? { ...n, data: { ...n.data, ...data } } : n,
    ))
    // Also update rawNodes so the canvas (driven by visibleNodes ← rawNodes)
    // re-renders immediately with the new name/photo/details.
    updateRawNode(realId, data)
  }, [setNodes, updateRawNode])

  const onDeleteNode = useCallback(async (id: string) => {
    await api.persons.delete(toRealId(id))
    setSelectedNodeId(null)
    await fetchGraph()
  }, [fetchGraph, setSelectedNodeId])

  const onSaveNode = useCallback(async (id: string, payload: SavePayload) => {
    const realId = toRealId(id)
    await api.persons.update(realId, {
      full_name:        payload.fullName,
      first_name:       payload.firstName ?? null,
      middle_name:      payload.middleName ?? null,
      last_name:        payload.lastName ?? null,
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
      photo_thumbnail_url: payload.photoThumbnailUrl ?? null,
    })
    onUpdateNode(id, {
      fullName:         payload.fullName,
      firstName:        payload.firstName ?? undefined,
      middleName:       payload.middleName ?? undefined,
      lastName:         payload.lastName ?? undefined,
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
      photoThumbnailUrl: payload.photoThumbnailUrl ?? undefined,
    })
    // Note: result.potential_matches is intentionally ignored on the edit
    // path. The "Possible match found" suggestion only fires when a person
    // is first created (see onAddRelation below).
  }, [onUpdateNode])

  const onAddRelation = useCallback(async (action: RelAction, fullName: string, extras?: AddExtras): Promise<string | null> => {
    if (!selectedNodeId) return null
    // Selecting a ghost (intra-family-marriage duplicate) must behave as if
    // the user clicked the real node — backend has no concept of ghosts.
    const realSelectedNodeId = toRealId(selectedNodeId)

    const cleanName = titleCase(fullName) || 'Unknown'

    // Ghost ids are a render-only abstraction (intra-family marriages) — the
    // cascade rules and person lookups must reason about real ids.
    const realEdges = edges.map(e => ({
      ...e,
      source: toRealId(e.source),
      target: toRealId(e.target),
    }))
    const personOf = (pid: string) =>
      nodes.find(n => toRealId(n.id) === pid)?.data as unknown as PersonData | undefined

    const isChildAdd        = action === 'son'     || action === 'daughter'
    const isSiblingAdd      = action === 'brother' || action === 'sister'
    const needsParentChoice = isChildAdd || isSiblingAdd

    // ── Gotra inheritance ──────────────────────────────────────────────────
    // Gotra follows the paternal line. Downward: a new son/daughter starts with
    // the father's gotra (the anchor if male, else the anchor's male spouse); a
    // new brother/sister starts with the anchor's father's gotra. Upward: a new
    // father starts with the anchor child's gotra (a child shares its father's
    // gotra, so the relationship is symmetric). Mothers keep their own paternal
    // gotra, so 'mother' is intentionally excluded. It's only a default — the
    // field stays editable in the node panel.
    let inheritedGotra: string | undefined
    if (needsParentChoice) {
      const anchor = personOf(realSelectedNodeId)
      let father: PersonData | undefined
      if (isChildAdd) {
        father = anchor?.gender === 'male' ? anchor : realEdges
          .filter(e => (e.data as unknown as EdgeData | undefined)?.relType === 'SPOUSE_OF'
            && (e.source === realSelectedNodeId || e.target === realSelectedNodeId))
          .map(e => personOf(e.source === realSelectedNodeId ? e.target : e.source))
          .find(p => p?.gender === 'male')
      } else {
        father = realEdges
          .filter(e => (e.data as unknown as EdgeData | undefined)?.relType === 'PARENT_OF'
            && e.target === realSelectedNodeId)
          .map(e => personOf(e.source))
          .find(p => p?.gender === 'male')
      }
      inheritedGotra = father?.gotra || undefined
    } else if (action === 'father') {
      inheritedGotra = personOf(realSelectedNodeId)?.gotra || undefined
    }

    try {
      const person = await api.persons.create({
        full_name:  cleanName,
        is_alive:   true,
        gender:     extras?.gender ?? GENDER_BY_RELATION[action] ?? undefined,
        birth_year: extras?.birthYear,
        gotra:      inheritedGotra,
      })

      // photo_url is not accepted on create — patch it immediately after
      if (extras?.photoUrl) {
        try { await api.persons.update(person.id, { photo_url: extras.photoUrl }) }
        catch { /* non-critical: node is created, photo can be added later */ }
      }

      // All cascade logic (base edge + derived edges) lives in relationshipRules.ts.
      // For an "Add spouse" action, decorate the base SPOUSE_OF op with the
      // marriage metadata so it lands on that single edge (not the cascades).
      const ops = computeCascadeOps(action, realSelectedNodeId, person.id, realEdges)
      const adoptionSub = extras?.adoptionStatus === 'adopted' ? 'adopted' : 'biological'

      for (const op of ops) {
        const isBaseSpouseEdge =
          action === 'spouse' &&
          op.rel_type === 'SPOUSE_OF' &&
          op.from_person_id === person.id &&
          op.to_person_id === realSelectedNodeId
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

      // Duplicate recommendations are opt-in via the wizard's review step now,
      // so skip the auto modals when the wizard asks us to (skipDuplicateCheck).
      if (!extras?.skipDuplicateCheck) {
        if (person.potential_matches && person.potential_matches.length > 0) {
          onDuplicateFound(person.id, person.potential_matches, {
            fullName: cleanName,
            gender:   GENDER_BY_RELATION[action] ?? null,
          })
        }

        // Same-family duplicate: a node with this name already exists in this
        // tree — offer to view it or send a merge request instead.
        if (person.same_tree_matches && person.same_tree_matches.length > 0) {
          onSameTreeDuplicate(person.id, cleanName, person.same_tree_matches)
        }
      }

      return person.id
    } catch (err) {
      console.error('Failed to add relation:', err)
      return null
    }
  }, [selectedNodeId, nodes, edges, fetchGraph, setSelectedNodeId, onDuplicateFound, onSameTreeDuplicate])

  return { onUpdateNode, onSaveNode, onDeleteNode, onAddRelation }
}
