import { useState } from 'react'
import Button from '../ui/Button'
import Drawer from '../ui/Drawer'
import FilterSidebar from './FilterSidebar'

export default function MobileFilters({ total = null, ...sidebarProps }) {
  const [isOpen, setIsOpen] = useState(false)
  const close = () => setIsOpen(false)

  return (
    <div className="md:hidden">
      <Button variant="outline" aria-haspopup="dialog" onClick={() => setIsOpen(true)}>
        Filters
      </Button>
      <Drawer isOpen={isOpen} onClose={close} label="Filters" closeLabel="Close filters">
        <h2 className="border-b border-gray-200 px-4 py-3 text-lg font-bold">Filters</h2>
        <div className="flex-1 overflow-y-auto px-4">
          <FilterSidebar {...sidebarProps} />
        </div>
        <div className="border-t border-gray-200 p-3">
          <Button onClick={close} className="w-full">
            {total === null ? 'Show results' : `Show ${total.toLocaleString('en-US')} results`}
          </Button>
        </div>
      </Drawer>
    </div>
  )
}
