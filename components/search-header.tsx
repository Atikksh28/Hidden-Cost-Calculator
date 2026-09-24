'use client'

import { useState } from 'react'
import { Search, X, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchHeaderProps {
  onSearch: (query: string) => void
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  searchQuery: string
  propertyType: string | null
  minPrice: number | null
  maxPrice: number | null
  location: string | null
}

export function SearchHeader({ onSearch, onFilterChange }: SearchHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    propertyType: null,
    minPrice: null,
    maxPrice: null,
    location: null,
  })

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    const updatedFilters = { ...filters, searchQuery: value }
    setFilters(updatedFilters)
    onSearch(value)
    onFilterChange(updatedFilters)
  }

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const updatedFilters = { ...filters, [key]: value }
    setFilters(updatedFilters)
    onFilterChange(updatedFilters)
  }

  const clearSearch = () => {
    setSearchQuery('')
    const clearedFilters: FilterState = {
      searchQuery: '',
      propertyType: null,
      minPrice: null,
      maxPrice: null,
      location: null,
    }
    setFilters(clearedFilters)
    onSearch('')
    onFilterChange(clearedFilters)
  }

  const hasActiveFilters =
    searchQuery ||
    filters.propertyType ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.location

  return (
    <section className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Search bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by property name, location..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10 h-11 bg-card border-border"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="h-11 w-11"
          >
            <Filter className="h-5 w-5" />
          </Button>
        </div>

        {/* Filter options */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border">
            {/* Property Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Property Type</label>
              <select
                value={filters.propertyType || ''}
                onChange={(e) =>
                  handleFilterChange('propertyType', e.target.value || null)
                }
                className="w-full h-9 px-3 py-2 rounded-md bg-card border border-border text-sm text-foreground"
              >
                <option value="">All Types</option>
                <option value="Rent">Rent</option>
                <option value="EMI">EMI (Purchase)</option>
              </select>
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Location</label>
              <select
                value={filters.location || ''}
                onChange={(e) =>
                  handleFilterChange('location', e.target.value || null)
                }
                className="w-full h-9 px-3 py-2 rounded-md bg-card border border-border text-sm text-foreground"
              >
                <option value="">All Locations</option>
                <option value="Bandra">Bandra</option>
                <option value="Powai">Powai</option>
                <option value="Andheri">Andheri</option>
              </select>
            </div>

            {/* Min Price Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Min Monthly Cost</label>
              <Input
                type="number"
                placeholder="Min (₹)"
                value={filters.minPrice || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'minPrice',
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="h-9 bg-card border-border text-sm"
              />
            </div>

            {/* Max Price Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Max Monthly Cost</label>
              <Input
                type="number"
                placeholder="Max (₹)"
                value={filters.maxPrice || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'maxPrice',
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="h-9 bg-card border-border text-sm"
              />
            </div>
          </div>
        )}

        {/* Active filters display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-4 text-sm">
            <span className="text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Search: "{searchQuery}"
              </span>
            )}
            {filters.propertyType && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Type: {filters.propertyType}
              </span>
            )}
            {filters.location && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Location: {filters.location}
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Price: ₹{filters.minPrice || '0'} - ₹{filters.maxPrice || '∞'}
              </span>
            )}
            <button
              onClick={clearSearch}
              className="text-primary hover:underline text-xs ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
