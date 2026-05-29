import { useState } from 'react'
import SessionPicker from './components/SessionPicker'
import SignatureChart from './components/dna/SignatureChart'
import RadarChart from './components/radar/RadarChart'
import CornerChart from './components/corner/CornerChart'
import ScatterPlot from './components/compare/ScatterPlot'
import { useAppStore } from './stores/store'
import { getDriverDNA, getCluster } from './api'
import type { ClusterPoint } from './api'

export default function App() {
  const {
    year, round, sessionType, selectedDrivers,
    dnaProfiles, addDNAProfile,
    setLoading, setError, loading, error,
  } = useAppStore()

  const [clusterPoints, setClusterPoints] = useState<ClusterPoint[]>([])
  const [clusterLoading, setClusterLoading] = useState(false)

  const handleAnalyse = async () => {
    if (!round || selectedDrivers.length === 0) return
    setLoading(true)
    setError(null)
    for (const driver of selectedDrivers) {
      try {
        const dna = await getDriverDNA(year, round.round, sessionType, driver)
        addDNAProfile(dna)
      } catch (e) {
        setError(`Failed to load DNA for ${driver}`)
      }
    }
    setLoading(false)
  }

  const handleCluster = async () => {
    if (!round) return
    setClusterLoading(true)
    setError(null)
    try {
      const result = await getCluster(year, round.round, sessionType)
      setClusterPoints(result.points)
    } catch (e) {
      setError('Failed to load cluster data')
    }
    setClusterLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <div className="border-b border-zinc-800 px-8 py-4 flex items-center gap-4">
        <span className="text-red-500 font-black text-xl tracking-tight">PITWALL</span>
        <span className="text-zinc-500 text-sm">Driver DNA Analyser</span>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 flex gap-8">

        {/* Left — session picker */}
        <div className="w-80 shrink-0">
          <SessionPicker />

          <button
            onClick={handleAnalyse}
            disabled={!round || selectedDrivers.length === 0 || loading}
            className="mt-4 w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-30
                       disabled:cursor-not-allowed rounded-xl font-bold text-sm
                       transition-colors"
          >
            {loading ? 'Analysing...' : 'Analyse DNA'}
          </button>

          <button
            onClick={handleCluster}
            disabled={!round || clusterLoading}
            className="mt-2 w-full py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30
                       disabled:cursor-not-allowed rounded-xl font-bold text-sm
                       transition-colors"
          >
            {clusterLoading ? 'Loading all drivers...' : 'Style Scatter — all drivers'}
          </button>

          {error && (
            <p className="mt-3 text-red-400 text-sm">{error}</p>
          )}
        </div>

        {/* Right — results */}
        <div className="flex-1">
          {dnaProfiles.length === 0 && clusterPoints.length === 0 ? (
            <div className="h-96 flex items-center justify-center text-zinc-600 text-sm">
              Select a session, pick drivers, hit Analyse DNA
            </div>
          ) : (
            <div className="flex flex-col gap-6">

              {/* Scatter plot */}
              {clusterPoints.length > 0 && (
                <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6">
                  <ScatterPlot points={clusterPoints} />
                </div>
              )}

              {/* Radar */}
              {dnaProfiles.length > 0 && (
                <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6">
                  <RadarChart profiles={dnaProfiles} />
                </div>
              )}

              {/* Corner breakdown */}
              {dnaProfiles.length > 0 && (
                <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6">
                  <CornerChart profiles={dnaProfiles} />
                </div>
              )}

              {/* Driver cards */}
              {dnaProfiles.map((dna) => (
                <div
                  key={dna.driver_code}
                  className="bg-zinc-900 rounded-xl border border-zinc-700 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-1 h-10 rounded-full"
                      style={{ backgroundColor: dna.team_color }}
                    />
                    <div>
                      <p className="font-black text-lg tracking-tight">{dna.driver_code}</p>
                      <p className="text-zinc-400 text-sm">{dna.full_name} · {dna.team}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-zinc-400 text-xs">Best lap</p>
                      <p className="font-mono font-bold">
                        {new Date(dna.best_lap_time * 1000).toISOString().substr(14, 8)}
                      </p>
                    </div>
                  </div>

                  <SignatureChart dna={dna} />

                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {dna.style_dimensions.map((dim) => (
                      <div key={dim.name} className="bg-zinc-800 rounded-lg p-3">
                        <p className="text-zinc-500 text-xs mb-1">{dim.label}</p>
                        <div className="h-1.5 bg-zinc-700 rounded-full">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${dim.value * 100}%`,
                              backgroundColor: dna.team_color,
                            }}
                          />
                        </div>
                        <p className="text-xs font-mono mt-1 text-zinc-300">
                          {(dim.value * 100).toFixed(0)}
                        </p>
                      </div>
                    ))}
                  </div>

                </div>
              ))}

            </div>
          )}
        </div>

      </div>
    </div>
  )
}