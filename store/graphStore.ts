import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface GraphState {
  currentZoom: number
  isDark: boolean
  collapsedUnitIds: string[]
  expandedCouples: string[]
  setCurrentZoom: (zoom: number) => void
  setIsDark: (dark: boolean) => void
  toggleCollapse: (key: string) => void
  initCollapseState: (ids: string[]) => void
  expandCouple: (key: string) => void
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set) => ({
      currentZoom: 0.85,
      isDark: false,
      collapsedUnitIds: [],
      expandedCouples: [],
      setCurrentZoom: (zoom) => set({ currentZoom: zoom }),
      setIsDark: (dark) => set({ isDark: dark }),
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
    }),
    {
      name: 'ancestree-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ isDark: state.isDark }),
    }
  )
)
