import { useState } from 'react'
import type { DriverDNA } from '../../api'
import { getSeasonComparison } from '../../api'

interface Props {
  currentDriver: string
  currentRound: number
  currentSessionType: string
}

const AVAILABLE_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018]

type ProfileWithYear = DriverDNA & { year: number }

export default function SeasonCompare({ currentDriver, currentRound, currentSessionType }: Props) {
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [profiles, setProfiles] = useState<ProfileWithYear[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    )
  }

  const handleCompare = async () => {
    if (selectedYears.length < 2) return
    setLoading(true)
    setError(null)
    try {
      const result = await getSeasonComparison(
        currentDriver,
        selectedYears,
        currentRound,
        currentSessionType,
      )
      setProfiles(result.profiles)
    } catch (e) {
      setError('Failed to load season comparison')
    }
    setLoading(false)
  }

  return (
    <div style={{ background: '#18181b', borderRadius: '0.75rem', border: '1px solid #3f3f46', padding: '1rem' }}>
      <p style={{ color: '#a1a1aa', fontSize: '0.7rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
        Season Comparison — {currentDriver}
      </p>
      <p style={{ color: '#71717a', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
        Pick years to compare {currentDriver}'s driving style across seasons
      </p>

      {/* Year picker */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {AVAILABLE_YEARS.map(year => (
          <button
            key={year}
            onClick={() => toggleYear(year)}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: selectedYears.includes(year) ? '#dc2626' : '#27272a',
              color: selectedYears.includes(year) ? 'white' : '#a1a1aa',
            }}
          >
            {year}
          </button>
        ))}
      </div>

      <button
        onClick={handleCompare}
        disabled={selectedYears.length < 2 || loading}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: selectedYears.length < 2 || loading ? '#27272a' : '#dc2626',
          borderRadius: '0.5rem',
          fontWeight: 700,
          fontSize: '0.875rem',
          border: 'none',
          color: 'white',
          cursor: selectedYears.length < 2 || loading ? 'not-allowed' : 'pointer',
          opacity: selectedYears.length < 2 || loading ? 0.5 : 1,
          marginBottom: '1rem',
        }}
      >
        {loading ? 'Loading...' : `Compare ${selectedYears.length} seasons`}
      </button>

      {error && <p style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{error}</p>}

      {/* Results */}
      {profiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Style dimensions comparison across years */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a' }}>
                  <th style={{ textAlign: 'left', color: '#71717a', padding: '0.5rem 0.5rem 0.5rem 0', fontFamily: 'monospace', fontWeight: 400 }}>
                    Dimension
                  </th>
                  {profiles.map(p => (
                    <th key={p.year} style={{ color: p.team_color, padding: '0.5rem', fontFamily: 'monospace', textAlign: 'center' }}>
                      {p.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles[0].style_dimensions.map((dim, i) => (
                  <tr key={dim.name} style={{ borderBottom: '1px solid #1c1c1e' }}>
                    <td style={{ padding: '0.5rem 0.5rem 0.5rem 0', color: '#a1a1aa' }}>{dim.label}</td>
                    {profiles.map(p => {
                      const val = p.style_dimensions[i].value
                      const allVals = profiles.map(pr => pr.style_dimensions[i].value)
                      const best = Math.max(...allVals)
                      const isBest = val === best
                      return (
                        <td key={p.year} style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: isBest ? 700 : 400,
                              color: isBest ? p.team_color : '#71717a',
                            }}>
                              {(val * 100).toFixed(0)}
                            </span>
                            <div style={{ width: '3rem', height: '4px', background: '#27272a', borderRadius: '9999px' }}>
                              <div style={{
                                height: '4px',
                                borderRadius: '9999px',
                                width: `${val * 100}%`,
                                background: p.team_color,
                              }} />
                            </div>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Best lap times across years */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {profiles.map(p => (
              <div key={p.year} style={{
                background: '#27272a',
                borderRadius: '0.5rem',
                padding: '0.625rem 0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span style={{ color: p.team_color, fontWeight: 700, fontFamily: 'monospace' }}>{p.year}</span>
                <span style={{ color: '#71717a', fontSize: '0.7rem' }}>{p.team}</span>
                <span style={{ color: '#d4d4d8', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {new Date(p.best_lap_time * 1000).toISOString().substr(14, 8)}
                </span>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  )
}