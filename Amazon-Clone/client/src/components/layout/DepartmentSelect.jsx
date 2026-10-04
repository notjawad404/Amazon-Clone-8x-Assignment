import { useGetCategoriesQuery } from '../../features/catalog/catalogApi'
import Icon from '../ui/Icon'

export default function DepartmentSelect({ value, onChange }) {
  const { data: departments = [] } = useGetCategoriesQuery()
  const selected = departments.find((department) => department.slug === value)

  return (
    <div className="relative hidden shrink-0 items-center gap-1 rounded-l-md border-r border-gray-300 bg-gray-100 px-2.5 text-xs text-gray-700 hover:bg-gray-200 has-focus-visible:ring-3 has-focus-visible:ring-btn-orange has-focus-visible:ring-inset md:flex">
      <span aria-hidden="true" className="max-w-40 truncate">
        {selected?.name ?? 'All'}
      </span>
      <Icon name="chevron-down" className="size-3" />
      <select
        aria-label="Search in department"
        value={selected ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 w-full cursor-pointer opacity-0"
      >
        <option value="">All Departments</option>
        {departments.map((department) => (
          <option key={department._id} value={department.slug}>
            {department.name}
          </option>
        ))}
      </select>
    </div>
  )
}
