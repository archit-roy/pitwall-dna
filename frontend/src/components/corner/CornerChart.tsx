import type { DriverDNA } from '../../api'

interface Props {
  profiles: DriverDNA[]
}

export default function CornerChart({ profiles }: Props) {
  if (!profiles.length) return null

  // Use corner profiles from the first driver as the base
  const corners = profiles[0].corner_profiles

  const metrics = [
    { key: 'min_corner_speed',    label: 'Min Speed',       unit: 'km/h', higher: 'good' },
    { key: 'brake_pressure_peak', label: 'Brake Pressure',  unit: '',     higher: 'neutral' },
    { key: 'throttle_application',label: 'Throttle Exit',   unit: '',     higher: 'good' },
  ]

  return (
    <div className="w-full">
      <p className="text-zinc-400 text-xs mb-4 font-mono uppercase tracking-widest">
        Corner Breakdown
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-500 pb-2 pr-4 font-mono">Corner</th>
              {metrics.map(m => (
                <th
                  key={m.key}
                  className="text-zinc-500 pb-2 px-2 font-mono text-center"
                  colSpan={profiles.length}
                >
                  {m.label}
                </th>
              ))}
            </tr>

            {/* Driver sub-headers */}
            <tr className="border-b border-zinc-800">
              <th className="pb-2 pr-4" />
              {metrics.map(m =>
                profiles.map(p => (
                  <th
                    key={`${m.key}-${p.driver_code}`}
                    className="pb-2 px-2 font-mono font-bold text-center"
                    style={{ color: p.team_color }}
                  >
                    {p.driver_code}
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {corners.map((corner, i) => (
              <tr
                key={corner.corner_number}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="py-2 pr-4 font-mono text-zinc-400">
                  T{corner.corner_number}
                  <span className="text-zinc-600 ml-2">
                    {(corner.distance_start / 1000).toFixed(1)}km
                  </span>
                </td>

                {metrics.map(m =>
                  profiles.map((p, pi) => {
                    // Get same corner from this driver's profile
                    const c = p.corner_profiles[i]
                    if (!c) return <td key={`${m.key}-${pi}`} className="px-2 py-2 text-center text-zinc-600">—</td>

                    const val = c[m.key as keyof typeof c] as number

                    // Find min/max across all drivers for this metric+corner
                    const allVals = profiles
                      .map(pr => pr.corner_profiles[i]?.[m.key as keyof typeof pr.corner_profiles[0]] as number)
                      .filter(Boolean)
                    const min = Math.min(...allVals)
                    const max = Math.max(...allVals)
                    const norm = max - min < 0.001 ? 0.5 : (val - min) / (max - min)

                    const isBest = m.higher === 'good'
                      ? val === max
                      : val === min

                    return (
                      <td
                        key={`${m.key}-${pi}`}
                        className="px-2 py-2 text-center font-mono"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={isBest ? 'font-bold' : 'text-zinc-400'}
                            style={isBest ? { color: p.team_color } : {}}
                          >
                            {m.key === 'min_corner_speed'
                              ? val.toFixed(0)
                              : (val * 100).toFixed(0) + '%'}
                          </span>
                          {/* Mini bar */}
                          <div className="w-12 h-1 bg-zinc-700 rounded-full">
                            <div
                              className="h-1 rounded-full"
                              style={{
                                width: `${norm * 100}%`,
                                backgroundColor: p.team_color,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    )
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}