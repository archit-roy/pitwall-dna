import { useEffect } from 'react'
import { useAppStore } from '../stores/store'
import { getSchedule, getDrivers } from '../api'

const YEARS = [2024, 2023, 2022, 2021]
const SESSION_TYPES = [
  { value: 'Q', label: 'Qualifying' },
  { value: 'R', label: 'Race' },
  { value: 'FP3', label: 'FP3' },
]

export default function SessionPicker() {
  const {
    year, round, sessionType, drivers, selectedDrivers,
    setYear, setRound, setSessionType, toggleDriver,
    setSchedule, setDrivers, schedule,
    setLoading, setError, loading,
  } = useAppStore()

  // Load schedule when year changes
  useEffect(() => {
    setLoading(true)
    getSchedule(year)
      .then(setSchedule)
      .catch(() => setError('Failed to load schedule'))
      .finally(() => setLoading(false))
  }, [year])

  // Load drivers when round or session changes
  useEffect(() => {
    if (!round) return
    setLoading(true)
    getDrivers(year, round.round, sessionType)
      .then(setDrivers)
      .catch(() => setError('Failed to load drivers'))
      .finally(() => setLoading(false))
  }, [round, sessionType])

  return (
    <div className="flex flex-col gap-6 p-6 bg-zinc-900 rounded-xl border border-zinc-700">

      {/* Year */}
      <div>
        <label className="text-zinc-400 text-sm mb-2 block">Season</label>
        <div className="flex gap-2">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                year === y
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Session type */}
      <div>
        <label className="text-zinc-400 text-sm mb-2 block">Session</label>
        <div className="flex gap-2">
          {SESSION_TYPES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSessionType(s.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sessionType === s.value
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Round */}
      <div>
        <label className="text-zinc-400 text-sm mb-2 block">Round</label>
        {loading && !schedule.length ? (
          <p className="text-zinc-500 text-sm">Loading schedule...</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {schedule.map((r) => (
              <button
                key={r.round}
                onClick={() => setRound(r)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  round?.round === r.round
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <span className="text-zinc-500 mr-2">R{r.round}</span>
                {r.event_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Drivers */}
      {drivers.length > 0 && (
        <div>
          <label className="text-zinc-400 text-sm mb-2 block">
            Drivers — pick up to 4
          </label>
          <div className="grid grid-cols-3 gap-2">
            {drivers.map((d) => (
              <button
                key={d.code}
                onClick={() => toggleDriver(d.code)}
                disabled={
                  !selectedDrivers.includes(d.code) && selectedDrivers.length >= 4
                }
                className={`px-3 py-2 rounded-lg text-sm font-mono font-bold transition-colors disabled:opacity-30 ${
                  selectedDrivers.includes(d.code)
                    ? 'text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
                style={
                  selectedDrivers.includes(d.code)
                    ? { backgroundColor: d.team_color }
                    : {}
                }
              >
                {d.code}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}