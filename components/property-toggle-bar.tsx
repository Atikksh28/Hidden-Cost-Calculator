'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { CustomProperty } from '@/components/add-property-form'

interface PropertyToggleBarProps {
  allProperties: (any | CustomProperty)[]
  visiblePropertyIds: string[]
  onToggleVisibility: (id: string) => void
  onDeleteCustomProperty: (id: string) => void
  onDeleteProperty: (id: string) => void
  onAddNew: () => void
  customPropertyIds: string[]
}

const MAX_COMPARE = 3

/**
 * Left sidebar for the Properties step: search, the saved-property list
 * (checkbox to compare + delete), and the Add Property button. Same data/
 * handlers as before — just laid out as a vertical sidebar instead of a
 * full-width horizontal bar.
 */
export function PropertyToggleBar({
  allProperties,
  visiblePropertyIds,
  onToggleVisibility,
  onDeleteCustomProperty,
  onDeleteProperty,
  onAddNew,
  customPropertyIds,
}: PropertyToggleBarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProperties = allProperties.filter((property) =>
    property.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedCount = visiblePropertyIds.length
  const atMax = selectedCount >= MAX_COMPARE

  return (
    <div className="h-full flex flex-col">
      <h3 className="font-semibold text-foreground mb-3 shrink-0">Comparison Settings</h3>

      {/* Search */}
      <div className="shrink-0 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="property-search"
            type="text"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">Select up to {MAX_COMPARE} to compare</p>
        <span className="text-xs font-medium text-muted-foreground">{selectedCount}/{MAX_COMPARE}</span>
      </div>

      {/* Saved properties list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
        {filteredProperties.map((property) => {
          const propertyId = property.id.toString()
          const isVisible = visiblePropertyIds.includes(propertyId)
          const isCustom = customPropertyIds.includes(propertyId)
          const isDisabled = !isVisible && atMax

          return (
            <div
              key={propertyId}
              className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                isVisible ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
              } ${isDisabled ? 'opacity-50' : ''}`}
            >
              <label className={`flex items-center gap-2 flex-1 min-w-0 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={isVisible}
                  disabled={isDisabled}
                  onChange={() => onToggleVisibility(propertyId)}
                  className="w-4 h-4 rounded border-border shrink-0"
                />
                <span className="text-sm font-medium truncate">{property.name}</span>
              </label>

              <button
                onClick={() => {
                  isCustom ? onDeleteCustomProperty(propertyId) : onDeleteProperty(propertyId)
                }}
                className="p-1 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors shrink-0"
                title="Delete property"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            </div>
          )
        })}

        {filteredProperties.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No properties match your search.</p>
        )}
      </div>

      {/* Add New */}
      <div className="shrink-0 pt-3 mt-3 border-t border-border">
        {customPropertyIds.length < 3 && allProperties.length < 6 ? (
          <Button onClick={onAddNew} variant="outline" className="w-full flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        ) : (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300">
            Maximum 3 custom properties allowed per comparison
          </div>
        )}
      </div>
    </div>
  )
}
