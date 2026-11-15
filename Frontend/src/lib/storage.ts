/** Browser storage that never throws: private windows and blocked site data simply forget. */
export const localStore = {
  read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? null : (JSON.parse(raw) as T)
    } catch {
      return null
    }
  },

  write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage is a convenience here; the app works without it.
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // See write.
    }
  },
}
