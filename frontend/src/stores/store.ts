import { create } from 'zustand'
import { Round, Driver, DriverDNA } from '../api'

interface AppState {
  // Session selection
  year: number
  round: Round | null
  sessionType: string
  selectedDrivers: string[]

  // Loaded data
  schedule: Round[]
  drivers: Driver[]
  dnaProfiles: DriverDNA[]

  // UI state
  loading: boolean
  error: string | null

  // Actions
  setYear: (year: number) => void
  setRound: (round: Round) => void
  setSessionType: (type: string) => void
  toggleDriver: (code: string) => void
  setSchedule: (rounds: Round[]) => void
  setDrivers: (drivers: Driver[]) => void
  addDNAProfile: (dna: DriverDNA) => void
  clearDNAProfiles: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  year: 2024,
  round: null,
  sessionType: 'Q',
  selectedDrivers: [],
  schedule: [],
  drivers: [],
  dnaProfiles: [],
  loading: false,
  error: null,

  setYear: (year) => set({ year, round: null, drivers: [], dnaProfiles: [] }),
  setRound: (round) => set({ round, drivers: [], dnaProfiles: [] }),
  setSessionType: (sessionType) => set({ sessionType, dnaProfiles: [] }),
  toggleDriver: (code) => set((state) => ({
    selectedDrivers: state.selectedDrivers.includes(code)
      ? state.selectedDrivers.filter((d) => d !== code)
      : [...state.selectedDrivers, code],
  })),
  setSchedule: (schedule) => set({ schedule }),
  setDrivers: (drivers) => set({ drivers }),
  addDNAProfile: (dna) => set((state) => ({
    dnaProfiles: [...state.dnaProfiles.filter(p => p.driver_code !== dna.driver_code), dna],
  })),
  clearDNAProfiles: () => set({ dnaProfiles: [], selectedDrivers: [] }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))