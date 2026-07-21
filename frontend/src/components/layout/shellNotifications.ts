import { createContext, useContext } from 'react'

export interface ShellNotificationContextValue {
  unreadNotificationCount: number | null
  setUnreadNotificationCount: (count: number | null) => void
  refreshUnreadNotificationCount: () => Promise<number | null>
}

export const ShellNotificationContext = createContext<ShellNotificationContextValue | undefined>(
  undefined,
)

export function useShellNotifications(): ShellNotificationContextValue {
  const context = useContext(ShellNotificationContext)

  if (!context) {
    return {
      unreadNotificationCount: null,
      setUnreadNotificationCount: () => undefined,
      refreshUnreadNotificationCount: async () => null,
    }
  }

  return context
}
