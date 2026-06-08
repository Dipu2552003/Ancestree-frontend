import { auth }          from './auth'
import { graph }         from './graph'
import { persons }       from './persons'
import { invite }        from './invite'
import { relationships } from './relationships'
import { search }        from './search'
import { merges }        from './merges'
import { notifications } from './notifications'

/** Aggregate API surface — preserves the original `api.<domain>.<call>()`
 *  shape so all existing call sites (`import { api } from '@/lib/api'`)
 *  keep working unchanged. */
export const api = {
  auth, graph, persons, invite, relationships, search, merges, notifications,
}

// Token helpers + fetch wrapper + depth constants
export {
  setToken, getToken, clearToken,
  ANCESTOR_DEPTH_DEFAULT, DESCENDANT_DEPTH_DEFAULT, DEPTH_LOAD_STEP,
} from './client'

// Shared response/payload types
export type {
  ConflictType, SearchResult, MergeConflict, PotentialMatch,
  PossibleMatchNotificationDetails, AppNotification, SentMergeRequest,
} from './types'
