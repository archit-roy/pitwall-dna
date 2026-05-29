import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000',
  timeout: 120000,
})

// --- Types ---

export interface Round {
  round: number
  event_name: string
  circuit: string
  country: string
  date: string
}

export interface Driver {
  code: string
  full_name: string
  team: string
  team_color: string
  number: number
}

export interface SignatureChannel {
  name: string
  label: string
  unit: string
  values: number[]
  raw_min: number
  raw_max: number
}

export interface StyleDimension {
  name: string
  label: string
  value: number
}

export interface CornerProfile {
  corner_number: number
  distance_start: number
  distance_end: number
  brake_point_offset: number
  min_corner_speed: number
  max_lateral_g: number
  throttle_application: number
  brake_pressure_peak: number
}

export interface DriverDNA {
  driver_code: string
  full_name: string
  team: string
  team_color: string
  session_key: string
  laps_used: number
  best_lap_time: number
  distance_meters: number[]
  channels: SignatureChannel[]
  style_dimensions: StyleDimension[]
  corner_profiles: CornerProfile[]
}

export interface ClusterPoint {
  driver: string
  full_name: string
  team: string
  team_color: string
  x: number
  y: number
  style_dimensions: StyleDimension[]
}

// --- API calls ---

export const getSchedule = async (year: number): Promise<Round[]> => {
  const res = await client.get(`/api/sessions/schedule/${year}`)
  return res.data
}

export const getDrivers = async (
  year: number,
  round: number,
  sessionType: string
): Promise<Driver[]> => {
  const res = await client.get(`/api/sessions/${year}/${round}/${sessionType}/drivers`)
  return res.data
}

export const getDriverDNA = async (
  year: number,
  round: number,
  sessionType: string,
  driver: string
): Promise<DriverDNA> => {
  const res = await client.get(`/api/dna/${year}/${round}/${sessionType}/${driver}`)
  return res.data
}

export const getCluster = async (
  year: number,
  round: number,
  sessionType: string
): Promise<{ session_key: string; points: ClusterPoint[] }> => {
  const res = await client.get(`/api/dna/${year}/${round}/${sessionType}/cluster/all`)
  return res.data
}