'use client'

import React, { useEffect, useState, useRef } from 'react'
import {
  Wrench,
  ParkingCircle,
  MapPin,
  Bus,
  Sofa,
  AlertTriangle,
  Users,
  ScrollText,
  UtensilsCrossed,
  Zap,
  Home,
} from 'lucide-react'
import { Simulation, forceSimulation, forceCollide, forceX, forceY, forceManyBody } from 'd3-force'
import { formatIndianCurrency } from '@/lib/format-indian-currency'
import { useActiveProperty } from '@/context/active-property-context'
import { PropertyPillSelector } from '@/components/property-pill-selector'

// Generic hidden costs (used when no property is selected)
const genericCosts = [
  { icon: Users, label: 'Additional Charges', description: 'Maintenance fees', amount: 8000 },
  { icon: UtensilsCrossed, label: 'Lifestyle Costs', description: 'Groceries, utilities', amount: 3500 },
  { icon: ParkingCircle, label: 'Parking', description: 'Vehicle parking', amount: 5000 },
  { icon: MapPin, label: 'Commute', description: 'Travel to workplace', amount: 2000 },
  { icon: Wrench, label: 'Maintenance', description: 'Regular upkeep', amount: 2500 },
  { icon: AlertTriangle, label: 'Repairs', description: 'Breakage buffer', amount: 1500 },
  { icon: Sofa, label: 'Furnishing', description: 'Setup & decor', amount: 1500 },
  { icon: Bus, label: 'School Transport', description: 'Children commute', amount: 2000 },
  { icon: ScrollText, label: 'Registration', description: 'Stamp duty, legal', amount: 2000 },
  { icon: Zap, label: 'Emergency Buffer', description: 'Contingency fund', amount: 2000 },
]

// Property-specific cost breakdown (rent + all hidden costs)
const propertySpecificCosts: Record<string | number, typeof genericCosts> = {
  '1': [ // Bandra Apartment
    { icon: Home, label: 'Housing Payment', description: 'Rent or EMI', amount: 50000 },
    { icon: Users, label: 'Additional Charges', description: 'Maintenance fees', amount: 8000 },
    { icon: UtensilsCrossed, label: 'Lifestyle Costs', description: 'Groceries, utilities', amount: 3500 },
    { icon: ParkingCircle, label: 'Parking', description: 'Vehicle parking', amount: 5000 },
    { icon: MapPin, label: 'Commute', description: 'Travel to workplace', amount: 2000 },
    { icon: Wrench, label: 'Maintenance', description: 'Regular upkeep', amount: 2500 },
    { icon: AlertTriangle, label: 'Repairs', description: 'Breakage buffer', amount: 1500 },
    { icon: Sofa, label: 'Furnishing', description: 'Setup & decor', amount: 1500 },
    { icon: Bus, label: 'School Transport', description: 'Children commute', amount: 2000 },
    { icon: ScrollText, label: 'Registration', description: 'Stamp duty, legal', amount: 2000 },
  ],
  '2': [ // Powai Rental
    { icon: Home, label: 'Housing Payment', description: 'Rent or EMI', amount: 60000 },
    { icon: Users, label: 'Additional Charges', description: 'Maintenance fees', amount: 6500 },
    { icon: UtensilsCrossed, label: 'Lifestyle Costs', description: 'Groceries, utilities', amount: 3200 },
    { icon: ParkingCircle, label: 'Parking', description: 'Vehicle parking', amount: 4000 },
    { icon: MapPin, label: 'Commute', description: 'Travel to workplace', amount: 2500 },
    { icon: Wrench, label: 'Maintenance', description: 'Regular upkeep', amount: 2000 },
    { icon: AlertTriangle, label: 'Repairs', description: 'Breakage buffer', amount: 1200 },
    { icon: Sofa, label: 'Furnishing', description: 'Setup & decor', amount: 1000 },
    { icon: Bus, label: 'School Transport', description: 'Children commute', amount: 1500 },
    { icon: ScrollText, label: 'Registration', description: 'Stamp duty, legal', amount: 1500 },
  ],
  '3': [ // Andheri Purchase
    { icon: Home, label: 'Housing Payment', description: 'Rent or EMI', amount: 45000 },
    { icon: Users, label: 'Additional Charges', description: 'Maintenance fees', amount: 5000 },
    { icon: UtensilsCrossed, label: 'Lifestyle Costs', description: 'Groceries, utilities', amount: 2800 },
    { icon: ParkingCircle, label: 'Parking', description: 'Vehicle parking', amount: 3000 },
    { icon: MapPin, label: 'Commute', description: 'Travel to workplace', amount: 1500 },
    { icon: Wrench, label: 'Maintenance', description: 'Regular upkeep', amount: 3000 },
    { icon: AlertTriangle, label: 'Repairs', description: 'Breakage buffer', amount: 2000 },
    { icon: Sofa, label: 'Furnishing', description: 'Setup & decor', amount: 2500 },
    { icon: Bus, label: 'School Transport', description: 'Children commute', amount: 1800 },
    { icon: ScrollText, label: 'Registration', description: 'Stamp duty, legal', amount: 2500 },
  ],
}

function getCostCategories(activePropertyId?: string | number): typeof genericCosts {
  if (activePropertyId && activePropertyId in propertySpecificCosts) {
    return propertySpecificCosts[activePropertyId]
  }
  return genericCosts
}

const TOTAL_GENERIC_COST = genericCosts.reduce((sum, cat) => sum + cat.amount, 0)
const MAX_GENERIC_AMOUNT = Math.max(...genericCosts.map((cat) => cat.amount))

function getCircleRadius(amount: number, maxAmount: number): number {
  const minRadius = 28
  const maxRadius = 90
  const normalized = Math.sqrt(amount / maxAmount)
  return minRadius + normalized * (maxRadius - minRadius)
}

const colorPalette = [
  'from-blue-400 to-blue-500',
  'from-green-400 to-green-500',
  'from-yellow-400 to-yellow-500',
  'from-red-400 to-red-500',
]

function getCategoryColor(index: number): string {
  return colorPalette[index % colorPalette.length]
}

interface ForceNode {
  id: number
  x: number
  y: number
  vx?: number
  vy?: number
  radius: number
  amount: number
  index: number
}

function calculatePackedPositions(containerWidth: number, containerHeight: number, costs: typeof genericCosts): ForceNode[] {
  const centerX = containerWidth / 2
  const centerY = containerHeight / 2
  const padding = 8
  const maxAmount = Math.max(...costs.map((c) => c.amount))
  
  const nodes: ForceNode[] = costs.map((cat, idx) => ({
    id: idx,
    x: centerX + (Math.random() - 0.5) * 100,
    y: centerY + (Math.random() - 0.5) * 100,
    radius: getCircleRadius(cat.amount, maxAmount),
    amount: cat.amount,
    index: idx,
  }))
  
  const simulation = forceSimulation(nodes)
    .force('collide', forceCollide<ForceNode>((d) => d.radius + 15).strength(1.3))
    .force('x', forceX<ForceNode>(centerX).strength(0.04))
    .force('y', forceY<ForceNode>(centerY).strength(0.04))
    .force('charge', forceManyBody<ForceNode>().strength(-15))
    .stop()
  
  for (let i = 0; i < 400; i++) {
    simulation.tick()
  }
  
  nodes.forEach((node) => {
    const minX = node.radius + padding
    const maxX = containerWidth - node.radius - padding
    const minY = node.radius + padding
    const maxY = containerHeight - node.radius - padding
    
    node.x = Math.max(minX, Math.min(maxX, node.x))
    node.y = Math.max(minY, Math.min(maxY, node.y))
  })
  
  return nodes
}

interface BubbleProps {
  category: (typeof genericCosts)[0]
  node: ForceNode
  percentage: number
  index: number
  totalCost: number
}

function Bubble({ category, node, percentage, index, totalCost }: BubbleProps) {
  const Icon = category.icon
  const [isHovered, setIsHovered] = useState(false)
  const colorClass = getCategoryColor(index)
  const fontSize = node.radius * 0.28
  const iconSize = node.radius * 0.5
  
  return (
    <div
      className="absolute group"
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        transform: 'translate(-50%, -50%)',
        animation: `bubbleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.05}s both`,
        transition: 'all 300ms ease',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative flex items-center justify-center rounded-full bg-gradient-to-br ${colorClass} opacity-60 hover:opacity-80 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer`}
        style={{
          width: `${node.radius * 2}px`,
          height: `${node.radius * 2}px`,
          transform: isHovered ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        <div className="absolute inset-0 rounded-full bg-white/15" />
        
        <div className="relative flex flex-col items-center justify-center z-10 px-2 gap-0.5">
          <Icon className="text-white flex-shrink-0" style={{ width: `${iconSize}px`, height: `${iconSize}px` }} />
          {node.radius > 35 && (
            <p className="text-white font-bold text-center leading-tight line-clamp-2" style={{ fontSize: `${Math.max(8, fontSize)}px` }}>
              {formatIndianCurrency(category.amount)}
            </p>
          )}
        </div>
      </div>
      
      {isHovered && (
        <div className="absolute top-full mt-3 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-50">
          <div className="bg-foreground text-background rounded-lg px-3 py-2 text-xs font-semibold shadow-lg">
            <p className="font-bold">{category.label}</p>
            <p className="text-background/80 text-xs">{formatIndianCurrency(category.amount)}</p>
            <p className="text-background/70 text-xs mt-0.5">{percentage.toFixed(1)}% of total</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function CostBreakdown() {
  const { activeProperty } = useActiveProperty()
  const [nodes, setNodes] = useState<ForceNode[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  
  const costCategories = getCostCategories(activeProperty?.id)
  const totalCost = costCategories.reduce((sum, cat) => sum + cat.amount, 0)
  
  useEffect(() => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const width = rect.width > 0 ? rect.width : 700
    const height = 700
    
    const positions = calculatePackedPositions(width, height, costCategories)
    setNodes(positions)
  }, [activeProperty?.id, costCategories])
  
  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-secondary/5">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What are you really paying for?
          </h2>
          <p className="text-foreground/60 text-lg">
            Understand every hidden cost that impacts your monthly expenses
          </p>
        </div>
        
        {/* Property Pill Selector */}
        <PropertyPillSelector />
        
        <style>{`
          @keyframes bubbleIn {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.5);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}</style>

        <div 
          ref={containerRef}
          className="relative w-full mx-auto overflow-hidden"
          style={{ minHeight: '700px' }}
        >
          {nodes.map((node, idx) => {
            const category = costCategories[node.index]
            const percentage = (category.amount / totalCost) * 100
            
            return (
              <Bubble
                key={`${activeProperty?.id}-${idx}`}
                category={category}
                node={node}
                percentage={percentage}
                index={idx}
                totalCost={totalCost}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
