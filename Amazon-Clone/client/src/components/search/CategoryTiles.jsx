import { Link } from 'react-router-dom'
import { imageSrcSet, imageUrl } from '../../utils/cloudinary'

const TILE_IMAGE_WIDTH = 120

export default function CategoryTiles({ department }) {
  if (!department.children.length) return null

  return (
    <section aria-labelledby="category-tiles-heading" className="mb-5">
      <h2 id="category-tiles-heading" className="mb-2 text-lg font-bold">
        Shop by category
      </h2>
      <ul className="flex [scrollbar-width:thin] gap-3 overflow-x-auto pb-2">
        {department.children.map((category) => (
          <li key={category._id} className="w-28 shrink-0 sm:w-32">
            <Link
              to={`/c/${category.slug}`}
              className="group block rounded-sm focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
            >
              <div className="flex aspect-square items-center justify-center rounded-full bg-gray-100 p-3">
                {category.image && (
                  <img
                    src={imageUrl(category.image.url, { w: TILE_IMAGE_WIDTH })}
                    srcSet={imageSrcSet(category.image.url, TILE_IMAGE_WIDTH)}
                    alt=""
                    width={TILE_IMAGE_WIDTH}
                    height={TILE_IMAGE_WIDTH}
                    className="size-full object-contain mix-blend-multiply"
                  />
                )}
              </div>
              <span className="mt-1.5 block text-center text-sm leading-tight group-hover:text-link-hover group-hover:underline">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
