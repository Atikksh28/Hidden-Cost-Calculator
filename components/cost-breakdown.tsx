'use client'

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Wrench,
  ParkingCircle,
  MapPin,
  AlertTriangle,
  Zap,
  Home,
  Package,
  Landmark,
  type LucideIcon,
} from 'lucide-react'
import {
  forceSimulation,
  forceCollide,
  forceX,
  forceY,
  type ForceCollide,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3-force'
import { formatIndianCurrency } from '@/lib/format-indian-currency'
import type { TrueCostBreakdown } from '@/lib/calculate-true-cost'
import { BREAKDOWN_LABELS, type PropertyWithBreakdown } from '@/lib/breakdown'

type BreakdownKey = keyof TrueCostBreakdown

// One fixed icon + color per breakdown category — the same every time.
const CATEGORY_STYLES: Record<BreakdownKey, { icon: LucideIcon; gradient: string; dot: string }> = {
  rent: { icon: Home, gradient: 'from-violet-400 to-violet-500', dot: 'bg-violet-500' },
  maintenance: { icon: Wrench, gradient: 'from-blue-400 to-blue-500', dot: 'bg-blue-500' },
  parking: { icon: ParkingCircle, gradient: 'from-cyan-400 to-cyan-500', dot: 'bg-cyan-500' },
  commuteCost: { icon: MapPin, gradient: 'from-amber-400 to-amber-500', dot: 'bg-amber-500' },
  utilities: { icon: Zap, gradient: 'from-lime-400 to-lime-500', dot: 'bg-lime-500' },
  repairBuffer: { icon: AlertTriangle, gradient: 'from-red-400 to-red-500', dot: 'bg-red-500' },
  amortizedOneTime: { icon: Package, gradient: 'from-orange-400 to-orange-500', dot: 'bg-orange-500' },
  depositOpportunityCost: { icon: Landmark, gradient: 'from-emerald-400 to-emerald-500', dot: 'bg-emerald-500' },
}

const CATEGORY_ORDER = Object.keys(CATEGORY_STYLES) as BreakdownKey[]

interface BubbleCategory {
  key: BreakdownKey
  amount: number
}

/** Built straight from the property's trueCostBreakdown — the same object the Monthly Breakdown table reads. */
function buildCategories(breakdown: TrueCostBreakdown): BubbleCategory[] {
  return CATEGORY_ORDER.map((key) => ({ key, amount: breakdown[key] }))
}

// ---------------------------------------------------------------------------
// Sizing. Bubble AREA is proportional to the amount (radius ~ sqrt(amount)).
// The property's biggest category (usually rent) gets the max radius so it can
// never swallow the panel; the rest scale from it, and tiny values are floored
// so they stay visible and tappable. Everything is a fraction of the box size,
// so the chart scales down cleanly on mobile.
// ---------------------------------------------------------------------------
const DESKTOP_SIZE = 300
const MOBILE_SIZE = 260
const MIN_RADIUS_RATIO = 14 / 300
const MAX_RADIUS_RATIO = 70 / 300
const AMOUNT_LABEL_RATIO = 35 / 300 // bubbles bigger than this also show their amount

function getCircleRadius(amount: number, maxAmount: number, size: number): number {
  const minR = size * MIN_RADIUS_RATIO
  const maxR = size * MAX_RADIUS_RATIO
  if (maxAmount <= 0) return minR
  return Math.min(maxR, Math.max(minR, maxR * Math.sqrt(amount / maxAmount)))
}

// Physics tuning
const WALL_PAD = 2
const WALL_BOUNCE = 0.65
const COLLIDE_GAP = 2
const CENTER_PULL = 0.08
const RADIUS_LERP = 0.15 // how quickly a bubble grows/shrinks to its new size, per tick

interface SimNode extends SimulationNodeDatum {
  key: BreakdownKey
  r: number
  targetR: number
  leaving: boolean
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), Math.max(lo, hi))
}

/** 300px on desktop, 260px on small screens. */
function useChartSize(): number {
  const [size, setSize] = useState(DESKTOP_SIZE)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const update = () => setSize(mq.matches ? DESKTOP_SIZE : MOBILE_SIZE)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return size
}

interface BubbleProps {
  bubbleKey: BreakdownKey
  amount: number
  node: SimNode | undefined
  showAmount: boolean
  fontSize: number
  active: boolean
  enterDelay: number
  register: (key: BreakdownKey, el: HTMLDivElement | null) => void
  onPointerDown: (key: BreakdownKey, e: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (key: BreakdownKey, e: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: (key: BreakdownKey, e: React.PointerEvent<HTMLDivElement>) => void
  onPointerEnter: (key: BreakdownKey, e: React.PointerEvent<HTMLDivElement>) => void
  onPointerLeave: (key: BreakdownKey, e: React.PointerEvent<HTMLDivElement>) => void
  onFocus: (key: BreakdownKey) => void
  onBlur: (key: BreakdownKey) => void
}

function Bubble({
  bubbleKey,
  amount,
  node,
  showAmount,
  fontSize,
  active,
  enterDelay,
  register,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
}: BubbleProps) {
  const { icon: Icon, gradient } = CATEGORY_STYLES[bubbleKey]
  const r = node?.r ?? 0
  const x = (node?.x ?? 0) - r
  const y = (node?.y ?? 0) - r

  return (
    // Position/size of this wrapper are driven imperatively by the simulation's tick
    // (see handleTick), so physics never goes through React renders.
    <div
      ref={(el) => register(bubbleKey, el)}
      role="button"
      tabIndex={0}
      aria-label={`${BREAKDOWN_LABELS[bubbleKey]}: ${formatIndianCurrency(amount)}`}
      className="absolute left-0 top-0 rounded-full cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{
        width: `${r * 2}px`,
        height: `${r * 2}px`,
        transform: `translate3d(${x}px, ${y}px, 0)`,
        touchAction: 'none',
        zIndex: active ? 20 : 1,
      }}
      onPointerDown={(e) => onPointerDown(bubbleKey, e)}
      onPointerMove={(e) => onPointerMove(bubbleKey, e)}
      onPointerUp={(e) => onPointerUp(bubbleKey, e)}
      onPointerCancel={(e) => onPointerUp(bubbleKey, e)}
      onPointerEnter={(e) => onPointerEnter(bubbleKey, e)}
      onPointerLeave={(e) => onPointerLeave(bubbleKey, e)}
      onFocus={() => onFocus(bubbleKey)}
      onBlur={() => onBlur(bubbleKey)}
    >
      <div className="h-full w-full" style={{ animation: `bubbleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${enterDelay}s both` }}>
        <div
          className={`relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${gradient} shadow-lg transition-all duration-300 ${
            active ? 'opacity-90 shadow-2xl' : 'opacity-60'
          }`}
          style={{ transform: active ? 'scale(1.08)' : 'scale(1)' }}
        >
          <div className="absolute inset-0 rounded-full bg-white/15" />
          <div className="relative z-10 flex flex-col items-center justify-center gap-0.5 px-1">
            <Icon
              className="text-white flex-shrink-0"
              style={{ width: showAmount ? '28%' : '55%', height: 'auto', aspectRatio: '1' }}
            />
            {showAmount && (
              <p className="text-white font-bold text-center leading-tight" style={{ fontSize: `${Math.max(8, fontSize)}px` }}>
                {formatIndianCurrency(amount)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface CostBreakdownProps {
  /** The property the Results page is showing — the same one the Monthly Breakdown table gets. */
  property: PropertyWithBreakdown
}

export function CostBreakdown({ property }: CostBreakdownProps) {
  const size = useChartSize()
  const sizeRef = useRef(size)
  sizeRef.current = size

  // ₹0 categories (parking, commute, utilities are often 0) get no bubble at all.
  const categories = useMemo(
    () => buildCategories(property.trueCostBreakdown).filter((c) => c.amount > 0),
    [property]
  )
  const total = categories.reduce((sum, c) => sum + c.amount, 0)
  const amountByKey = useMemo(() => new Map(categories.map((c) => [c.key, c.amount])), [categories])
  const maxAmount = categories.length ? Math.max(...categories.map((c) => c.amount)) : 0

  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null)
  const nodesRef = useRef<Map<BreakdownKey, SimNode>>(new Map())
  const elsRef = useRef<Map<BreakdownKey, HTMLDivElement>>(new Map())
  const enterIndexRef = useRef<Map<BreakdownKey, number>>(new Map())
  const dragRef = useRef<{
    key: BreakdownKey
    pointerId: number
    offX: number
    offY: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)

  const [renderedKeys, setRenderedKeys] = useState<BreakdownKey[]>([])
  const [activeKey, setActiveKeyState] = useState<BreakdownKey | null>(null)
  const activeKeyRef = useRef<BreakdownKey | null>(null)
  const setActiveKey = useCallback((key: BreakdownKey | null) => {
    activeKeyRef.current = key
    setActiveKeyState(key)
  }, [])

  const register = useCallback((key: BreakdownKey, el: HTMLDivElement | null) => {
    if (el) elsRef.current.set(key, el)
    else elsRef.current.delete(key)
  }, [])

  // Tooltip follows its bubble while it moves, and flips below it / stays inside the box at the edges.
  const positionTooltip = useCallback(() => {
    const el = tooltipRef.current
    const key = activeKeyRef.current
    const node = key ? nodesRef.current.get(key) : undefined
    if (!el || !node) return
    const box = sizeRef.current
    const w = el.offsetWidth
    const h = el.offsetHeight
    const x = clamp(node.x ?? 0, w / 2 + 4, box - w / 2 - 4)
    let y = (node.y ?? 0) - node.r - 8 - h
    if (y < 4) y = (node.y ?? 0) + node.r + 8
    y = clamp(y, 4, box - h - 4)
    el.style.transform = `translate3d(${x - w / 2}px, ${y}px, 0)`
  }, [])

  const handleTick = useCallback(() => {
    const box = sizeRef.current
    const nodes = nodesRef.current
    const gone: BreakdownKey[] = []

    nodes.forEach((n, key) => {
      // Ease toward the target radius so a property switch grows/shrinks bubbles instead of jumping.
      n.r += (n.targetR - n.r) * RADIUS_LERP
      if (Math.abs(n.targetR - n.r) < 0.05) n.r = n.targetR
      if (n.leaving && n.r < 0.6) {
        gone.push(key)
        return
      }

      // Walls: clamp inside the box and bounce back with some energy loss.
      const lo = n.r + WALL_PAD
      const hi = box - n.r - WALL_PAD
      const x = n.x ?? box / 2
      const y = n.y ?? box / 2
      if (x < lo) {
        n.x = lo
        n.vx = Math.abs(n.vx ?? 0) * WALL_BOUNCE
      } else if (x > hi) {
        n.x = Math.max(lo, hi)
        n.vx = -Math.abs(n.vx ?? 0) * WALL_BOUNCE
      }
      if (y < lo) {
        n.y = lo
        n.vy = Math.abs(n.vy ?? 0) * WALL_BOUNCE
      } else if (y > hi) {
        n.y = Math.max(lo, hi)
        n.vy = -Math.abs(n.vy ?? 0) * WALL_BOUNCE
      }

      const el = elsRef.current.get(key)
      if (el) {
        el.style.width = `${n.r * 2}px`
        el.style.height = `${n.r * 2}px`
        el.style.transform = `translate3d(${(n.x ?? 0) - n.r}px, ${(n.y ?? 0) - n.r}px, 0)`
      }
    })

    const sim = simRef.current
    if (gone.length && sim) {
      gone.forEach((key) => {
        nodes.delete(key)
        enterIndexRef.current.delete(key)
      })
      setRenderedKeys((prev) => prev.filter((k) => nodes.has(k)))
      sim.nodes(Array.from(nodes.values()))
    }

    // d3's collide force caches radii, so hand it the current ones for the next tick.
    const collide = sim?.force('collide') as ForceCollide<SimNode> | undefined
    collide?.radius((d) => d.r + COLLIDE_GAP)
    positionTooltip()
  }, [positionTooltip])

  // One simulation for the lifetime of the chart.
  useEffect(() => {
    const sim = forceSimulation<SimNode>([])
      .alphaDecay(0.03)
      .velocityDecay(0.35)
      .force('x', forceX<SimNode>(sizeRef.current / 2).strength(CENTER_PULL))
      .force('y', forceY<SimNode>(sizeRef.current / 2).strength(CENTER_PULL))
      .force('collide', forceCollide<SimNode>((d) => d.r + COLLIDE_GAP).strength(1).iterations(3))
      .on('tick', handleTick)
    simRef.current = sim
    return () => {
      sim.stop()
      sim.on('tick', null)
      simRef.current = null
    }
  }, [handleTick])

  // Reconcile the simulation with the current property/size: existing bubbles ease to
  // their new radius, new categories pop in, vanished ones shrink away.
  useEffect(() => {
    const sim = simRef.current
    if (!sim) return
    const nodes = nodesRef.current
    const keep = new Set(categories.map((c) => c.key))

    const added: BreakdownKey[] = []
    categories.forEach((c) => {
      const targetR = getCircleRadius(c.amount, maxAmount, size)
      const existing = nodes.get(c.key)
      if (existing) {
        existing.targetR = targetR
        existing.leaving = false
      } else {
        nodes.set(c.key, {
          key: c.key,
          r: targetR,
          targetR,
          leaving: false,
          x: size / 2 + (Math.random() - 0.5) * 40,
          y: size / 2 + (Math.random() - 0.5) * 40,
        })
        added.push(c.key)
      }
    })
    nodes.forEach((n) => {
      if (!keep.has(n.key)) {
        n.leaving = true
        n.targetR = 0
        n.fx = null
        n.fy = null
      }
    })
    added.forEach((key, i) => enterIndexRef.current.set(key, i))

    sim.force('x', forceX<SimNode>(size / 2).strength(CENTER_PULL))
    sim.force('y', forceY<SimNode>(size / 2).strength(CENTER_PULL))
    sim.nodes(Array.from(nodes.values()))
    setRenderedKeys(Array.from(nodes.keys()))
    sim.alpha(0.8).restart()
  }, [categories, maxAmount, size])

  useLayoutEffect(() => {
    positionTooltip()
  }, [activeKey, positionTooltip])

  // ----- interaction: drag (mouse/touch/pen), hover tooltip (mouse), tap tooltip (touch) -----
  const pointerPos = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) }
  }

  const handlePointerDown = (key: BreakdownKey, e: React.PointerEvent<HTMLDivElement>) => {
    const node = nodesRef.current.get(key)
    if (!node || node.leaving) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Capture can fail if the pointer is already gone; the drag still works while the pointer stays over the bubble.
    }
    const p = pointerPos(e)
    const wasActive = activeKeyRef.current === key
    dragRef.current = {
      key,
      pointerId: e.pointerId,
      offX: (node.x ?? 0) - p.x,
      offY: (node.y ?? 0) - p.y,
      startX: p.x,
      startY: p.y,
      moved: false,
    }
    node.fx = node.x
    node.fy = node.y
    setActiveKey(e.pointerType === 'mouse' ? key : wasActive ? null : key)
    simRef.current?.alphaTarget(0.3).restart()
  }

  const handlePointerMove = (key: BreakdownKey, e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const node = nodesRef.current.get(key)
    if (!drag || !node || drag.key !== key || drag.pointerId !== e.pointerId) return
    const p = pointerPos(e)
    if (Math.hypot(p.x - drag.startX, p.y - drag.startY) > 5) drag.moved = true
    const box = sizeRef.current
    node.fx = clamp(p.x + drag.offX, node.r + WALL_PAD, box - node.r - WALL_PAD)
    node.fy = clamp(p.y + drag.offY, node.r + WALL_PAD, box - node.r - WALL_PAD)
  }

  const handlePointerUp = (key: BreakdownKey, e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.key !== key || drag.pointerId !== e.pointerId) return
    const node = nodesRef.current.get(key)
    if (node) {
      node.fx = null
      node.fy = null
    }
    dragRef.current = null
    simRef.current?.alphaTarget(0)
    if (e.pointerType === 'mouse') {
      if (!e.currentTarget.matches(':hover')) setActiveKey(null)
    } else if (drag.moved) {
      setActiveKey(null)
    }
  }

  const handlePointerEnter = (key: BreakdownKey, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setActiveKey(key)
  }

  const handlePointerLeave = (key: BreakdownKey, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && !dragRef.current && activeKeyRef.current === key) setActiveKey(null)
  }

  const activeAmount = activeKey ? (amountByKey.get(activeKey) ?? 0) : 0

  return (
    <div className="w-full">
      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Bounded simulation box: bubbles can't leave it, and it doesn't grow with the page. */}
      <div
        ref={containerRef}
        className="relative mx-auto overflow-hidden rounded-2xl border border-border/60 bg-card/40"
        style={{ width: size, height: size }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setActiveKey(null)
        }}
      >
        {[...renderedKeys]
          .sort((a, b) => (nodesRef.current.get(b)?.targetR ?? 0) - (nodesRef.current.get(a)?.targetR ?? 0))
          .map((key) => {
            const node = nodesRef.current.get(key)
            const amount = amountByKey.get(key) ?? 0
            const radius = getCircleRadius(amount, maxAmount, size)
            return (
              <Bubble
                key={key}
                bubbleKey={key}
                amount={amount}
                node={node}
                showAmount={radius > size * AMOUNT_LABEL_RATIO}
                fontSize={radius * 0.28}
                active={activeKey === key}
                enterDelay={(enterIndexRef.current.get(key) ?? 0) * 0.05}
                register={register}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onFocus={setActiveKey}
                onBlur={() => setActiveKey(null)}
              />
            )
          })}

        {activeKey && (
          <div
            ref={tooltipRef}
            className="pointer-events-none absolute left-0 top-0 z-30 whitespace-nowrap rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background shadow-lg"
          >
            <p className="font-bold">{BREAKDOWN_LABELS[activeKey]}</p>
            <p className="text-background/80">{formatIndianCurrency(activeAmount)}</p>
            <p className="mt-0.5 text-background/70">
              {total > 0 ? ((activeAmount / total) * 100).toFixed(1) : '0.0'}% of total
            </p>
          </div>
        )}
      </div>

      {/* Legend: one dot per category currently shown */}
      <ul className="mx-auto mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground" style={{ maxWidth: size + 40 }}>
        {categories.map((c) => (
          <li key={c.key} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${CATEGORY_STYLES[c.key].dot}`} />
            {BREAKDOWN_LABELS[c.key]}
          </li>
        ))}
      </ul>
    </div>
  )
}
