import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { LapDelta } from '../../api'

interface Props {
  delta: LapDelta
}

export default function DeltaChart({ delta }: Props) {
  const svgRef     = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const draw = () => {
    if (!svgRef.current || !wrapperRef.current) return

    const svg    = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width  = wrapperRef.current.clientWidth
    const height = 160
    const margin = { top: 20, right: 10, bottom: 30, left: 45 }

    svg.attr('width', width).attr('height', height)

    const xScale = d3.scaleLinear()
      .domain([delta.distance[0], delta.distance[delta.distance.length - 1]])
      .range([margin.left, width - margin.right])

    const maxAbs = Math.max(Math.abs(d3.min(delta.delta) ?? 0), Math.abs(d3.max(delta.delta) ?? 0))

    const yScale = d3.scaleLinear()
      .domain([-maxAbs * 1.2, maxAbs * 1.2])
      .range([height - margin.bottom, margin.top])

    // Zero line
    svg.append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', '#3f3f46')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4')

    // Grid lines
    svg.append('g')
      .selectAll('line')
      .data(yScale.ticks(4))
      .join('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#27272a')
      .attr('stroke-width', 0.5)

    // Area above zero — driver A faster
    const areaAbove = d3.area<number>()
      .x((_, i) => xScale(delta.distance[i]))
      .y0(yScale(0))
      .y1(d => yScale(Math.max(0, d)))
      .curve(d3.curveBasis)

    svg.append('path')
      .datum(delta.delta)
      .attr('d', areaAbove)
      .attr('fill', delta.color_a)
      .attr('opacity', 0.3)

    // Area below zero — driver B faster
    const areaBelow = d3.area<number>()
      .x((_, i) => xScale(delta.distance[i]))
      .y0(yScale(0))
      .y1(d => yScale(Math.min(0, d)))
      .curve(d3.curveBasis)

    svg.append('path')
      .datum(delta.delta)
      .attr('d', areaBelow)
      .attr('fill', delta.color_b)
      .attr('opacity', 0.3)

    // Delta line
    const line = d3.line<number>()
      .x((_, i) => xScale(delta.distance[i]))
      .y(d => yScale(d))
      .curve(d3.curveBasis)

    svg.append('path')
      .datum(delta.delta)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.8)

    // Y axis
    svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale).ticks(4).tickFormat(d => `${+d > 0 ? '+' : ''}${(+d).toFixed(2)}s`))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text').attr('fill', '#71717a').attr('font-size', 9)
      })

    // X axis
    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${(+d / 1000).toFixed(1)}km`))
      .call(g => {
        g.select('.domain').attr('stroke', '#3f3f46')
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text').attr('fill', '#71717a').attr('font-size', 9)
      })

    // Driver labels at the end
    const finalY = yScale(delta.delta[delta.delta.length - 1])
    const labelX = width - margin.right - 4

    svg.append('text')
      .attr('x', labelX)
      .attr('y', Math.min(finalY - 6, height - margin.bottom - 10))
      .attr('text-anchor', 'end')
      .attr('font-size', 9)
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('fill', delta.final_delta > 0 ? delta.color_a : delta.color_b)
      .text(delta.final_delta > 0
        ? `${delta.driver_a} +${Math.abs(delta.final_delta).toFixed(3)}s`
        : `${delta.driver_b} +${Math.abs(delta.final_delta).toFixed(3)}s`
      )
  }

  useEffect(() => {
    draw()
    const observer = new ResizeObserver(() => draw())
    if (wrapperRef.current) observer.observe(wrapperRef.current)
    return () => observer.disconnect()
  }, [delta])

  return (
    <div ref={wrapperRef} className="w-full">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <p style={{ color: '#a1a1aa', fontSize: '0.7rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Lap Delta
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.7rem', fontFamily: 'monospace' }}>
          <span style={{ color: delta.color_a }}>▲ {delta.driver_a} faster</span>
          <span style={{ color: delta.color_b }}>▼ {delta.driver_b} faster</span>
        </div>
      </div>
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}