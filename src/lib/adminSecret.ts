const STORAGE_KEY = "paisa-paper-admin-secret"

export function readStoredAdminSecret(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}

export function writeStoredAdminSecret(value: string): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private browsing / blocked storage — secret just won't be
    // remembered next time, no functional impact on this session.
  }
}
