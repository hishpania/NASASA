export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
  photonUrl: import.meta.env.VITE_PHOTON_URL ?? 'https://photon.komoot.io',
} as const
