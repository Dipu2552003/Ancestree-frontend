import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AddPersonContext {
  connectToPersonId?: string
  relType?: string
}

interface GraphState {
  selectedNodeId: string | null
  sidePanelOpen: boolean
  addPersonModalOpen: boolean
  addPersonContext: AddPersonContext | null
  currentZoom: number
  visibleGenerations: number[] | 'all'
  searchQuery: string
  searchResults: string[]
  isDark: boolean
  setSelectedNodeId: (id: string | null) => void
  setSidePanelOpen: (open: boolean) => void
  setAddPersonModalOpen: (open: boolean) => void
  setAddPersonContext: (context: AddPersonContext | null) => void
  setCurrentZoom: (zoom: number) => void
  setVisibleGenerations: (generations: number[] | 'all') => void
  setSearchQuery: (query: string) => void
  setSearchResults: (results: string[]) => void
  setIsDark: (dark: boolean) => void
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set) => ({
      selectedNodeId: null,
      sidePanelOpen: false,
      addPersonModalOpen: false,
      addPersonContext: null,
      currentZoom: 0.85,
      visibleGenerations: 'all',
      searchQuery: '',
      searchResults: [],
      isDark: false,
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      setSidePanelOpen: (open) => set({ sidePanelOpen: open }),
      setAddPersonModalOpen: (open) => set({ addPersonModalOpen: open }),
      setAddPersonContext: (context) => set({ addPersonContext: context }),
      setCurrentZoom: (zoom) => set({ currentZoom: zoom }),
      setVisibleGenerations: (generations) => set({ visibleGenerations: generations }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results }),
      setIsDark: (dark) => set({ isDark: dark }),
    }),
    {
      name: 'ancestree-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ isDark: state.isDark }),
    }
  )
)
