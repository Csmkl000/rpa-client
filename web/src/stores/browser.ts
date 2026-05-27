import { create } from 'zustand'
import { browserApi } from '../lib/api'

interface BrowserState {
  connected: boolean
  info: any
  loading: boolean
  check: () => Promise<void>
}

export const useBrowserStore = create<BrowserState>((set) => ({
  connected: false,
  info: null,
  loading: false,
  check: async () => {
    try {
      const status = await browserApi.status()
      set({ connected: status.connected, info: status })
    } catch {
      set({ connected: false, info: null })
    }
  },
}))
