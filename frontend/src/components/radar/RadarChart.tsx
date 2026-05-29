import { DriverDNA } from '../../api'

interface Props {
  profiles: DriverDNA[]
}

const SIZE    = 260
const CENTER  = SIZE / 2
const RADIUS  = 100
const LEVELS  = 4

function polarToXY(angle: number, r: number) {
  return {
    x: CENTER + r * Math.sin(angle),
    y: CENTER - r * Math.cos(angle),
  }
}

export default function RadarChart({ profiles }: Props) {
  if (!profiles.length) return null

  const dims   = profiles[0].style_dimensions
  const n      = dims.length
  const angles = dims.map((_, i) => (2 * Math.PI * i) / n)

  // Grid rings
  const rings = Array.from({ length: LEVELS }, (_, i) => {
    const r = (RADIUS / LEVELS) * (i + 1)
    const points = angles.map(a => polarToXY(a, r))
    return points.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'
  })

  // Axis lines
  const axes = angles.map(a => ({
    x2: polarToXY(a, RADIUS).x,
    y2: polarToXY(a, RADIUS).y,
  }))

  // Labels
  const labels = dims.map((dim, i) => {
    const pos = polarToXY(angles[i], RADIUS + 18)
    return { label: dim.label, ...pos }
  })

  // Driver polygons
  const polygons = profiles.map(profile => {
    const points = profile.style_dimensions.map((dim, i) => {
      return polarToXY(angles[i], dim.value * RADIUS)
    })
    const path = points.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'
    return { path, color: profile.team_color, code: profile.driver_code }
  })

  return (
    <div className="w-full">
      <p className="text-zinc-400 text-xs mb-2 font-mono uppercase tracking-widest">
        Style Radar
      </p>

      <div className="flex items-start gap-6">
        <svg width={SIZE} height={SIZE} className="shrink-0">

          {/* Grid rings */}
          {rings.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#3f3f46" strokeWidth={0.5} />
          ))}

          {/* Axis lines */}
          {axes.map((a, i) => (
            <line
              key={i}
              x1={CENTER} y1={CENTER}
              x2={a.x2}   y2={a.y2}
              stroke="#3f3f46" strokeWidth={0.5}
            />
          ))}

          {/* Driver polygons */}
          {polygons.map((p) => (
            <g key={p.code}>
              <path d={p.path} fill={p.color} fillOpacity={0.15} stroke={p.color} strokeWidth={2} />
            </g>
          ))}

          {/* Labels */}
          {labels.map((l, i) => (
            <text
              key={i}
              x={l.x} y={l.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fill="#a1a1aa"
              fontFamily="monospace"
            >
              {l.label}
            </text>
          ))}

        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-2 pt-2">
          {profiles.map(p => (
            <div key={p.driver_code} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: p.team_color }}
              />
              <span className="text-xs font-mono text-zinc-300">{p.driver_code}</span>
              <span className="text-xs text-zinc-500">{p.full_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}