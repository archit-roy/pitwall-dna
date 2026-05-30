import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { DriverDNA, SignatureChannel } from '../../api'

interface Props {
  dna: DriverDNA
}

const CHANNELS = ['Throttle', 'Brake', 'Speed', 'nGear', 'LateralG']

const CHANNEL_COLORS: Record<string, string> = {
  Throttle: '#22c55e',
  Brake:    '#ef4444',
  Speed:    '#3b82f6',
  nGear:    '#f59e0b',
  LateralG: '#a855f7',
}

const CHANNEL_LABELS: Record<string, string> = {
  Throttle: 'Throttle',
  Brake:    'Brake',
  Speed:    'Speed',
  nGear:    'Gear',
  LateralG: 'Lateral G',
}

export default function SignatureChart({ dna }: Props) {
  const svgRef    = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const draw = () => {
    if (!svgRef.current || !wrapperRef.current) return

    const svg        = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width      = wrapperRef.current.clientWidth
    const rowHeight  = 50
    const marginLeft = 60
    const marginRight = 10
    const paddingTop  = 8

    const channels = dna.channels.filter(c => CHANNELS.includes(c.name))
    const totalHeight = channels.length * rowHeight + paddingTop + 20

    svg
      .attr('width', width)
      .attr('height', totalHeight)

    const distance = dna.distance_meters
    const xScale = d3
      .scaleLinear()
      .domain([distance[0], distance[distance.length - 1]])
      .range([marginLeft, width - marginRight])

    channels.forEach((channel: SignatureChannel, i: number) => {
      const y0    = paddingTop + i * rowHeight
      const color = CHANNEL_COLORS[channel.name] ?? '#888'
      const label = CHANNEL_LABELS[channel.name] ?? channel.name

      svg.append('rect')
        .attr('x', marginLeft)
        .attr('y', y0)
        .attr('width', width - marginLeft - marginRight)
        .attr('height', rowHeight)
        .attr('fill', i % 2 === 0 ? '#18181b' : '#121214')

      const yScale = d3
        .scaleLinear()
        .domain([0, 1])
        .range([y0 + rowHeight - 4, y0 + 4])

      const area = d3
        .area<number>()
        .x((_, idx) => xScale(distance[idx]))
        .y0(yScale(0))
        .y1((v) => yScale(v))
        .curve(d3.curveBasis)

      svg.append('path')
        .datum(channel.values)
        .attr('d', area)
        .attr('fill', color)
        .attr('opacity', 0.15)

      const line = d3
        .line<number>()
        .x((_, idx) => xScale(distance[idx]))
        .y((v) => yScale(v))
        .curve(d3.curveBasis)

      svg.append('path')
        .datum(channel.values)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.9)

      svg.append('text')
        .attr('x', marginLeft - 6)
        .attr('y', y0 + rowHeight / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('font-size', 10)
        .attr('fill', color)
        .attr('font-family', 'monospace')
        .text(label)
    })

    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(d => `${(+d / 1000).toFixed(1)}km`)

    svg.append('g')
      .attr('transform', `translate(0, ${totalHeight - 20})`)
      .call(xAxis)
      .call(g => {
        g.select('.domain').attr('stroke', '#3f3f46')
        g.selectAll('.tick line').attr('stroke', '#3f3f46')
        g.selectAll('.tick text')
          .attr('fill', '#71717a')
          .attr('font-size', 9)
      })
  }

  useEffect(() => {
    draw()

    const observer = new ResizeObserver(() => draw())
    if (wrapperRef.current) observer.observe(wrapperRef.current)
    return () => observer.disconnect()
  }, [dna])

  return (
    <div ref={wrapperRef} className="w-full overflow-hidden">
      <p className="text-zinc-400 text-xs mb-2 font-mono uppercase tracking-widest">
        Telemetry Signature
      </p>
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}