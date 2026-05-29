import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface GraphState {
  currentZoom: number
  isDark: boolean
  setCurrentZoom: (zoom: number) => void
  setIsDark: (dark: boolean) => void
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set) => ({
      currentZoom: 0.85,
      isDark: false,
      setCurrentZoom: (zoom) => set({ currentZoom: zoom }),
      setIsDark: (dark) => set({ isDark: dark }),
    }),
    {
      name: 'ancestree-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ isDark: state.isDark }),
    }
  )
)
