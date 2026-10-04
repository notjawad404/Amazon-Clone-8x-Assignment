import Skeleton from '../ui/Skeleton'
import { CATEGORY_CARD_COUNT } from '../../utils/constants'
import CategoryCard from './CategoryCard'

const SKELETON_KEYS = ['c1', 'c2', 'c3', 'c4']

// Departments with the most categories fill the 2×2 tiles best; keep the nav order on screen.
function pickDepartments(departments) {
  const chosen = new Set(
    departments
      .filter((department) => department.children.length)
      .toSorted((a, b) => b.children.length - a.children.length)
      .slice(0, CATEGORY_CARD_COUNT),
  )
  return departments.filter((department) => chosen.has(department))
}

function CardSkeleton() {
  return (
    <div className="bg-white p-5" aria-hidden="true">
      <Skeleton className="mb-4 h-6 w-2/3" />
      <div className="grid grid-cols-2 gap-4">
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  )
}

export default function CategoryCardGrid({ departments = [], isLoading = false }) {
  if (!isLoading && !departments.length) return null

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {isLoading
        ? SKELETON_KEYS.map((key) => <CardSkeleton key={key} />)
        : pickDepartments(departments).map((department) => (
            <CategoryCard key={department._id} department={department} />
          ))}
    </div>
  )
}
