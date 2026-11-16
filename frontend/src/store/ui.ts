import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  tone?: 'neutral' | 'good'
  action?: { label: string; run: () => void }
}

interface UIState {
  /** Add / edit drawer. `editingId` undefined means "add". */
  formOpen: boolean
  editingId?: string
  openAdd: () => void
  openEdit: (id: string) => void
  closeForm: () => void

  navOpen: boolean
  setNavOpen: (open: boolean) => void

  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
}

let toastSeq = 0

export const useUI = create<UIState>()((set, get) => ({
  formOpen: false,
  editingId: undefined,
  openAdd: () => set({ formOpen: true, editingId: undefined }),
  openEdit: (id) => set({ formOpen: true, editingId: id }),
  closeForm: () => set({ formOpen: false }),

  navOpen: false,
  setNavOpen: (navOpen) => set({ navOpen }),

  toasts: [],
  toast: (t) => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }))
    window.setTimeout(() => get().dismissToast(id), t.action ? 7000 : 4500)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
