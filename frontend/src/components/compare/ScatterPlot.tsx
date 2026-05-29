import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ClusterPoint } from '../../api'

interface Props {
  points: ClusterPoint[]
}

export default function ScatterPlot({ points }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<ClusterPoint | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!svgRef.current || !points.length) return

    const svg    = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width  = svgRef.current.clientWidth
    const height = 380
    const margin = { top: 20, right: 20, bottom: 40, left: 40 }

    svg.attr('height', height)

    const xScale = d3.scaleLinear()
      .domain(d3.extent(points, p => p.x) as [number, number])
      .range([margin.left, width - margin.right])
      .nice()

    const yScale = d3.scaleLinear()
      .domain(d3.extent(points, p => p.y) as [number, number])
      .range([height - margin.bottom, margin.top])
      .nice()

    // Grid lines
    svg.append('g')
      .selectAll('line')
      .data(yScale.ticks(5))
      .join('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#27272a')
      .attr('stroke-width', 1)

    svg.append('g')
      .selectAll('line')
      .data(xScale.ticks(5))
      .join('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#27272a')
      .attr('stroke-width', 1)

    // Axes
    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(0))
      .call(g => {
        g.select('.domain').attr('stroke', '#3f3f46')
        g.selectAll('.tick text').attr('fill', '#52525b').attr('font-size', 10)
      })

    svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale).ticks(5).tickSize(0))
      .call(g => {
        g.select('.domain').attr('stroke', '#3f3f46')
        g.selectAll('.tick text').attr('fill', '#52525b').attr('font-size', 10)
      })

    // Axis labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#52525b')
      .attr('font-size', 10)
      .attr('font-family', 'monospace')
      .text('Style Component 1')

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#52525b')
      .attr('font-size', 10)
      .attr('font-family', 'monospace')
      .text('Style Component 2')

    // Driver dots
    const g = svg.append('g')

    g.selectAll('circle')
      .data(points)
      .join('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 10)
      .attr('fill', d => d.team_color)
      .attr('fill-opacity', 0.85)
      .attr('stroke', '#18181b')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        setTooltip(d)
        setTooltipPos({ x: event.offsetX + 12, y: event.offsetY - 12 })
      })
      .on('mousemove', (event) => {
        setTooltipPos({ x: event.offsetX + 12, y: event.offsetY - 12 })
      })
      .on('mouseout', () => setTooltip(null))

    // Driver code labels
    g.selectAll('text')
      .data(points)
      .join('text')
      .attr('x', d => xScale(d.x))
      .attr('y', d => yScale(d.y) + 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 8)
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .attr('pointer-events', 'none')
      .text(d => d.driver)

  }, [points])

  return (
    <div className="w-full relative">
      <p className="text-zinc-400 text-xs mb-2 font-mono uppercase tracking-widest">
        Style Scatter — all drivers
      </p>
      <p className="text-zinc-600 text-xs mb-4">
        Drivers close together have similar driving styles. Hover for details.
      </p>

      <div className="relative">
        <svg ref={svgRef} className="w-full" />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-zinc-800 border border-zinc-700
                       rounded-lg p-3 text-xs z-10 min-w-40"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <p
              className="font-black text-sm mb-1"
              style={{ color: tooltip.team_color }}
            >
              {tooltip.driver}
            </p>
            <p className="text-zinc-400 mb-2">{tooltip.full_name}</p>
            <p className="text-zinc-500">{tooltip.team}</p>
            <div className="mt-2 flex flex-col gap-1">
              {tooltip.style_dimensions.slice(0, 4).map(d => (
                <div key={d.name} className="flex justify-between gap-4">
                  <span className="text-zinc-500">{d.label}</span>
                  <span className="font-mono text-zinc-300">
                    {(d.value * 100).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}