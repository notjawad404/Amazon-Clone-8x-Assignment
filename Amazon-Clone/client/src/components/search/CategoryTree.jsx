import { Link } from 'react-router-dom'
import { useGetCategoriesQuery } from '../../features/catalog/catalogApi'
import { findCategory, searchPath } from '../../utils/search'
import FilterSection from './FilterSection'
import { FILTER_OPTION } from './filterStyles'

function TreeItem({ node, to, isCurrent }) {
  if (isCurrent) {
    return (
      <span aria-current="page" className="text-sm font-bold">
        {node.name}
      </span>
    )
  }
  return (
    <Link to={to} className={FILTER_OPTION}>
      {node.name}
    </Link>
  )
}

// Category pages link to other category pages; search results keep the query and scope it.
export default function CategoryTree({ categorySlug, query, isCategoryRoute }) {
  const { data: departments = [] } = useGetCategoriesQuery()
  const placement = findCategory(departments, categorySlug)
  const pathFor = (slug) => (isCategoryRoute ? `/c/${slug}` : searchPath(query, slug))

  if (!departments.length) return null

  if (!placement) {
    return (
      <FilterSection title="Department">
        <ul className="space-y-1">
          {departments.map((department) => (
            <li key={department._id}>
              <TreeItem node={department} to={pathFor(department.slug)} />
            </li>
          ))}
        </ul>
      </FilterSection>
    )
  }

  const { department, category } = placement
  return (
    <FilterSection title="Department">
      {!isCategoryRoute && (
        <Link to={searchPath(query)} className={`${FILTER_OPTION} mb-1 block`}>
          ‹ Any Department
        </Link>
      )}
      <TreeItem node={department} to={pathFor(department.slug)} isCurrent={!category} />
      <ul className="mt-1 space-y-1 pl-3">
        {department.children.map((child) => (
          <li key={child._id}>
            <TreeItem
              node={child}
              to={pathFor(child.slug)}
              isCurrent={child._id === category?._id}
            />
          </li>
        ))}
      </ul>
    </FilterSection>
  )
}
