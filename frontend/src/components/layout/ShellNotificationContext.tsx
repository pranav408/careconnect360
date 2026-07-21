import type { ReactNode } from 'react'
import {
  ShellNotificationContext,
  type ShellNotificationContextValue,
} from './shellNotifications'

export function ShellNotificationProvider({
  value,
  children,
}: {
  value: ShellNotificationContextValue
  children: ReactNode
}) {
  return (
    <ShellNotificationContext.Provider value={value}>
      {children}
    </ShellNotificationContext.Provider>
  )
}
