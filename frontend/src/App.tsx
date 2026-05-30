import { useState } from 'react'
import SessionPicker from './components/SessionPicker'
import SignatureChart from './components/dna/SignatureChart'
import DeltaChart from './components/dna/DeltaChart'
import RadarChart from './components/radar/RadarChart'
import CornerChart from './components/corner/CornerChart'
import ScatterPlot from './components/compare/ScatterPlot'
import { SkeletonCard, SkeletonLabel } from './components/ui/Skeleton'
import { useAppStore } from './stores/store'
import { getDriverDNA, getCluster, getLapDelta } from './api'
import type { ClusterPoint, LapDelta } from './api'

export default function App() {
  const {
    year, round, sessionType, selectedDrivers,
    dnaProfiles, addDNAProfile,
    setLoading, setError, loading, error,
  } = useAppStore()

  const [clusterPoints, setClusterPoints] = useState<ClusterPoint[]>([])
  const [clusterLoading, setClusterLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(true)
  const [loadingDriver, setLoadingDriver] = useState<string | null>(null)
  const [lapDelta, setLapDelta] = useState<LapDelta | null>(null)
  const [deltaLoading, setDeltaLoading] = useState(false)

  const handleAnalyse = async () => {
    if (!round || selectedDrivers.length === 0) return
    setLoading(true)
    setError(null)
    setShowPicker(false)
    setLapDelta(null)
    for (const driver of selectedDrivers) {
      setLoadingDriver(driver)
      try {
        const dna = await getDriverDNA(year, round.round, sessionType, driver)
        addDNAProfile(dna)
      } catch (e) {
        setError(`Failed to load DNA for ${driver}`)
      }
    }
    setLoadingDriver(null)
    setLoading(false)
  }

  const handleCluster = async () => {
    if (!round) return
    setClusterLoading(true)
    setError(null)
    setShowPicker(false)
    try {
      const result = await getCluster(year, round.round, sessionType)
      setClusterPoints(result.points)
    } catch (e) {
      setError('Failed to load cluster data')
    }
    setClusterLoading(false)
  }

  const handleDelta = async () => {
    if (!round || dnaProfiles.length < 2) return
    setDeltaLoading(true)
    setError(null)
    try {
      const result = await getLapDelta(
        year, round.round, sessionType,
        dnaProfiles[0].driver_code,
        dnaProfiles[1].driver_code,
      )
      setLapDelta(result)
    } catch (e) {
      setError('Failed to load lap delta')
    }
    setDeltaLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: 'white' }}>

      {/* Header */}
      <div style={{
        borderBottom: '1px solid #27272a',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.05em' }}>PITWALL</span>
          <span style={{ color: '#3f3f46', fontSize: '0.875rem' }}>|</span>
          {round ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#ffffff', fontSize: '0.875rem', fontWeight: 700 }}>
                {round.event_name}
              </span>
              <span style={{
                padding: '0.125rem 0.5rem',
                background: '#27272a',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                color: '#a1a1aa',
                fontFamily: 'monospace',
              }}>
                {year} · {sessionType}
              </span>
            </div>
          ) : (
            <span style={{ color: '#71717a', fontSize: '0.875rem' }}>Driver DNA Analyser</span>
          )}
        </div>
        {(dnaProfiles.length > 0 || clusterPoints.length > 0 || loading || clusterLoading) && (
          <button
            onClick={() => setShowPicker(p => !p)}
            style={{
              padding: '0.375rem 0.75rem',
              background: '#27272a',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              color: '#d4d4d8',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {showPicker ? 'Hide' : 'Change session'}
          </button>
        )}
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Session picker */}
        {showPicker && (
          <div>
            <SessionPicker />

            <button
              onClick={handleAnalyse}
              disabled={!round || selectedDrivers.length === 0 || loading}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.875rem',
                background: (!round || selectedDrivers.length === 0 || loading) ? '#7f1d1d' : '#dc2626',
                borderRadius: '0.75rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                border: 'none',
                color: 'white',
                cursor: (!round || selectedDrivers.length === 0 || loading) ? 'not-allowed' : 'pointer',
                opacity: (!round || selectedDrivers.length === 0 || loading) ? 0.5 : 1,
              }}
            >
              {loading ? 'Analysing...' : 'Analyse DNA'}
            </button>

            <button
              onClick={handleCluster}
              disabled={!round || clusterLoading}
              style={{
                marginTop: '0.5rem',
                width: '100%',
                padding: '0.875rem',
                background: '#27272a',
                borderRadius: '0.75rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                border: 'none',
                color: 'white',
                cursor: (!round || clusterLoading) ? 'not-allowed' : 'pointer',
                opacity: (!round || clusterLoading) ? 0.5 : 1,
              }}
            >
              {clusterLoading ? 'Loading all drivers...' : 'Style Scatter — all drivers'}
            </button>

            {error && (
              <p style={{ marginTop: '0.75rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</p>
            )}
          </div>
        )}

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Loading labels */}
          {loadingDriver && (
            <SkeletonLabel text={`Loading telemetry for ${loadingDriver}...`} />
          )}
          {clusterLoading && (
            <SkeletonLabel text="Building style profiles for all drivers..." />
          )}
          {deltaLoading && (
            <SkeletonLabel text={`Computing lap delta...`} />
          )}

          {/* Skeleton placeholders */}
          {loading && selectedDrivers
            .filter(d => !dnaProfiles.find(p => p.driver_code === d))
            .map(d => <SkeletonCard key={d} />)
          }

          {/* Scatter */}
          {clusterPoints.length > 0 && (
            <div style={{ background: '#18181b', borderRadius: '0.75rem', border: '1px solid #3f3f46', padding: '1rem', overflow: 'hidden' }}>
              <ScatterPlot points={clusterPoints} />
            </div>
          )}

          {/* Radar */}
          {dnaProfiles.length > 0 && (
            <div style={{ background: '#18181b', borderRadius: '0.75rem', border: '1px solid #3f3f46', padding: '1rem' }}>
              <RadarChart profiles={dnaProfiles} />
            </div>
          )}

          {/* Lap delta — show button when 2+ drivers loaded */}
          {dnaProfiles.length >= 2 && !lapDelta && !deltaLoading && (
            <button
              onClick={handleDelta}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: '#1c1c1e',
                border: '1px dashed #3f3f46',
                borderRadius: '0.75rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                color: '#a1a1aa',
                cursor: 'pointer',
              }}
            >
              ⚡ Load lap delta — {dnaProfiles[0].driver_code} vs {dnaProfiles[1].driver_code}
            </button>
          )}

          {/* Delta chart */}
          {lapDelta && (
            <div style={{ background: '#18181b', borderRadius: '0.75rem', border: '1px solid #3f3f46', padding: '1rem' }}>
              <DeltaChart delta={lapDelta} />
            </div>
          )}

          {/* Corner breakdown */}
          {dnaProfiles.length > 0 && (
            <div style={{ background: '#18181b', borderRadius: '0.75rem', border: '1px solid #3f3f46', padding: '1rem', overflowX: 'auto' }}>
              <CornerChart profiles={dnaProfiles} />
            </div>
          )}

          {/* Driver cards */}
          {dnaProfiles.map((dna) => (
            <div
              key={dna.driver_code}
              style={{ background: '#18181b', borderRadius: '0.75rem', border: '1px solid #3f3f46', padding: '1rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '4px', height: '2.5rem', borderRadius: '9999px', background: dna.team_color, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 900, fontSize: '1.125rem', letterSpacing: '-0.025em' }}>{dna.driver_code}</p>
                  <p style={{ color: '#a1a1aa', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dna.full_name} · {dna.team}
                  </p>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>Best lap</p>
                  <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem' }}>
                    {new Date(dna.best_lap_time * 1000).toISOString().substr(14, 8)}
                  </p>
                </div>
              </div>

              <div style={{ overflow: 'hidden' }}>
                <SignatureChart dna={dna} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '1rem' }}>
                {dna.style_dimensions.map((dim) => (
                  <div key={dim.name} style={{ background: '#27272a', borderRadius: '0.5rem', padding: '0.625rem' }}>
                    <p style={{ color: '#71717a', fontSize: '0.7rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dim.label}</p>
                    <div style={{ height: '6px', background: '#3f3f46', borderRadius: '9999px' }}>
                      <div style={{
                        height: '6px',
                        borderRadius: '9999px',
                        width: `${dim.value * 100}%`,
                        background: dna.team_color,
                        transition: 'width 1s ease-out',
                      }} />
                    </div>
                    <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', marginTop: '0.25rem', color: '#d4d4d8' }}>
                      {(dim.value * 100).toFixed(0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {!loading && !clusterLoading && dnaProfiles.length === 0 && clusterPoints.length === 0 && !showPicker && (
            <div style={{ height: '16rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: '0.875rem' }}>
              Select a session, pick drivers, hit Analyse DNA
            </div>
          )}

        </div>
      </div>
    </div>
  )
}