import { useEffect, useState } from 'react'

export type CliStatus = {
  cliPathRegistered: boolean
  cliInstallStatusChecked: boolean
}

/**
 * Probes whether `orca` is registered on the user's PATH. The registration happens
 * outside this hook (Settings or the checklist action), so re-probe on return to the
 * window; `ready` gates both flags so readiness never reports a stale probe.
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
      setRegistered(
        status !== null && status.state === 'installed' && status.pathConfigured !== false
      )
      setChecked(true)
    }
    void refreshCliPathStatus()
    const handleFocus = (): void => void refreshCliPathStatus()
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        void refreshCliPathStatus()
      }
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      stale = true
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return {
    cliPathRegistered: ready && registered,
    cliInstallStatusChecked: ready && checked
  }
}
