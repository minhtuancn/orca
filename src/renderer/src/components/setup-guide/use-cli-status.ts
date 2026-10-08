import { useEffect, useState } from 'react'
import type { CliInstallStatus } from '../../../../shared/cli-install-types'
import { CLI_INSTALL_STATUS_CHANGED_EVENT } from '@/lib/cli-install-status-events'

export type CliStatus = {
  cliPathRegistered: boolean
  cliInstallStatusChecked: boolean
}

/**
 * `orca` is only callable from terminals outside Orca once the command is installed
 * *and* its directory is on the persisted PATH; an unreadable PATH (`null`) stays
 * unregistered rather than counted as done.
 */
export function isCliPathRegistered(status: CliInstallStatus | null): boolean {
  return status !== null && status.state === 'installed' && status.pathConfigured === true
}

/**
 * Probes whether `orca` is registered on the user's PATH. Registration happens outside
 * this hook (Settings or the checklist action), so re-probe on return to the window and
 * on the CLI section's own status events; `ready` masks both flags so readiness never
 * reports a stale probe.
 */
export function useCliStatus(ready: boolean): CliStatus {
  const [registered, setRegistered] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let stale = false
    const refreshCliPathStatus = async (): Promise<void> => {
      const status = await window.api.cli.getInstallStatus().catch(() => null)
      if (stale) {
        return
      }
      setRegistered(isCliPathRegistered(status))
      setChecked(true)
    }
    const reprobe = (): void => void refreshCliPathStatus()
    void refreshCliPathStatus()
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        reprobe()
      }
    }
    window.addEventListener('focus', reprobe)
    window.addEventListener(CLI_INSTALL_STATUS_CHANGED_EVENT, reprobe)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      stale = true
      window.removeEventListener('focus', reprobe)
      window.removeEventListener(CLI_INSTALL_STATUS_CHANGED_EVENT, reprobe)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return {
    cliPathRegistered: ready && registered,
    cliInstallStatusChecked: ready && checked
  }
}
