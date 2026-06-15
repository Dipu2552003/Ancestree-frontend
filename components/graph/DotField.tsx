'use client'

import { useRef, useEffect } from 'react'
import { readVar } from '@/lib/theme/cssVar'

interface Props { isDark: boolean }

interface Dot { ox: number; oy: number; x: number; y: number; vx: number; vy: number }

const GRID       = 28
const DOT_R      = 1.2
const REPEL_R    = 100
const REPEL_F    = 6
const SPRING     = 0.07
const DAMP       = 0.80

export default function DotField({ isDark }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse     = useRef({ x: -9999, y: -9999 })
  const dots      = useRef<Dot[]>([])
  const raf       = useRef(0)
  const isDarkRef = useRef(isDark)

  useEffect(() => { isDarkRef.current = isDark }, [isDark])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    // Resolve the themed dot color once (canvas can't read CSS vars directly).
    const dotLight = readVar('--c-dot', 'rgba(160,100,20,0.30)')

    const rebuild = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      const next: Dot[] = []
      const cols = Math.ceil(canvas.width  / GRID) + 2
      const rows = Math.ceil(canvas.height / GRID) + 2
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const ox = c * GRID, oy = r * GRID
          next.push({ ox, oy, x: ox, y: oy, vx: 0, vy: 0 })
        }
      dots.current = next
    }

    const onMove  = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY } }
    const onLeave = ()               => { mouse.current = { x: -9999,    y: -9999 } }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', rebuild)
    rebuild()

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const { x: mx, y: my } = mouse.current
      const color = isDarkRef.current ? 'rgba(255,255,255,0.14)' : dotLight

      for (const d of dots.current) {
        const dx   = d.x - mx
        const dy   = d.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < REPEL_R && dist > 0) {
          const strength = (REPEL_R - dist) / REPEL_R * REPEL_F
          d.vx += (dx / dist) * strength
          d.vy += (dy / dist) * strength
        }

        d.vx += (d.ox - d.x) * SPRING
        d.vy += (d.oy - d.y) * SPRING
        d.vx *= DAMP
        d.vy *= DAMP
        d.x  += d.vx
        d.y  += d.vy

        ctx.beginPath()
        ctx.arc(d.x, d.y, DOT_R, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }

      raf.current = requestAnimationFrame(tick)
    }

    raf.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', rebuild)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}
