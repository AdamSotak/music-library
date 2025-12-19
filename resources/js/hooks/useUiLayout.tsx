import { create } from "zustand"

type UiLayoutState = {
	isRightSidebarOpen: boolean
	openRightSidebar: () => void
	closeRightSidebar: () => void
	toggleRightSidebar: () => void
}

export const useUiLayout = create<UiLayoutState>((set) => ({
	isRightSidebarOpen: false,
	openRightSidebar: () => set({ isRightSidebarOpen: true }),
	closeRightSidebar: () => set({ isRightSidebarOpen: false }),
	toggleRightSidebar: () =>
		set((state) => ({ isRightSidebarOpen: !state.isRightSidebarOpen })),
}))
