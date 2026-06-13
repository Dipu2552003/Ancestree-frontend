import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  type AppNotification,
  ANCESTOR_DEPTH_DEFAULT,
  DESCENDANT_DEPTH_DEFAULT,
  DEPTH_LOAD_STEP,
} from '@/lib/api'

export type GotraMode = 'none' | 'node' | 'edge'

interface GraphState {
  currentZoom: number
  isDark: boolean
  gotraMode: GotraMode
  collapsedUnitIds: string[]
  expandedCouples: string[]
  notifications: AppNotification[]
  unreadCount: number
  activeNodeId: string | null
  // Depth-bounded loading state. The graph hook reads these to drive each
  // fetch; the chip components read the `hasMore*` flags to know when to show.
  // Keyed implicitly by the currently-loaded perspective — perspective change
  // resets these via `resetDepths()` in useGraphData.
  ancestorDepth: number
  descendantDepth: number
  hasMoreAncestors: boolean
  hasMoreDescendants: boolean
  setCurrentZoom: (zoom: number) => void
  setIsDark: (dark: boolean) => void
  setGotraMode: (mode: GotraMode) => void
  toggleCollapse: (key: string) => void
  initCollapseState: (ids: string[]) => void
  expandCouple: (key: string) => void
  setNotifications: (notifications: AppNotification[], unreadCount: number) => void
  markNotificationRead: (id: string) => void
  setActiveNodeId: (id: string | null) => void
  bumpAncestorDepth: () => void
  bumpDescendantDepth: () => void
  setDepthFlags: (flags: { hasMoreAncestors: boolean; hasMoreDescendants: boolean }) => void
  resetDepths: () => void
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set) => ({
      currentZoom: 0.85,
      isDark: false,
      gotraMode: 'none' as GotraMode,
      collapsedUnitIds: [],
      expandedCouples: [],
      notifications: [],
      unreadCount: 0,
      activeNodeId: null,
      ancestorDepth:      ANCESTOR_DEPTH_DEFAULT,
      descendantDepth:    DESCENDANT_DEPTH_DEFAULT,
      hasMoreAncestors:   false,
      hasMoreDescendants: false,
      bumpAncestorDepth: () => set(s => s.hasMoreAncestors
        ? { ancestorDepth: s.ancestorDepth + DEPTH_LOAD_STEP }
        : {}),
      bumpDescendantDepth: () => set(s => s.hasMoreDescendants
        ? { descendantDepth: s.descendantDepth + DEPTH_LOAD_STEP }
        : {}),
      setDepthFlags: ({ hasMoreAncestors, hasMoreDescendants }) =>
        set({ hasMoreAncestors, hasMoreDescendants }),
      resetDepths: () => set({
        ancestorDepth:      ANCESTOR_DEPTH_DEFAULT,
        descendantDepth:    DESCENDANT_DEPTH_DEFAULT,
        hasMoreAncestors:   false,
        hasMoreDescendants: false,
      }),
      setCurrentZoom: (zoom) => set({ currentZoom: zoom }),
      setIsDark: (dark) => set({ isDark: dark }),
      setGotraMode: (mode) => set({ gotraMode: mode }),
      toggleCollapse: (key) => set(s => ({
        collapsedUnitIds: s.collapsedUnitIds.includes(key)
          ? s.collapsedUnitIds.filter(k => k !== key)
          : [...s.collapsedUnitIds, key],
      })),
      initCollapseState: (ids) => set({ collapsedUnitIds: ids }),
      expandCouple: (key) => set(s => ({
        expandedCouples: s.expandedCouples.includes(key)
          ? s.expandedCouples.filter(k => k !== key)
          : [...s.expandedCouples, key],
      })),
      setActiveNodeId: (id) => set({ activeNodeId: id }),
      setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
      markNotificationRead: (id) => set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      })),
    }),
    {
      name: 'ancestree-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ isDark: state.isDark, gotraMode: state.gotraMode }),
    }
  )
)
