import { Link } from 'react-router-dom'
import { imageSrcSet, imageUrl } from '../../utils/cloudinary'
import { CATEGORY_CARD_TILES } from '../../utils/constants'

const TILE_IMAGE_WIDTH = 150

function Tile({ to, label, image }) {
  return (
    <li>
      <Link
        to={to}
        className="group block rounded-sm focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
      >
        <div className="flex aspect-square items-center justify-center rounded-sm bg-gray-100 p-2">
          {image && (
            <img
              src={imageUrl(image.url, { w: TILE_IMAGE_WIDTH })}
              srcSet={imageSrcSet(image.url, TILE_IMAGE_WIDTH)}
              alt=""
              width={TILE_IMAGE_WIDTH}
              height={TILE_IMAGE_WIDTH}
              className="size-full object-contain mix-blend-multiply"
            />
          )}
        </div>
        <span className="mt-1 block text-xs group-hover:text-link-hover group-hover:underline">
          {label}
        </span>
      </Link>
    </li>
  )
}

export default function CategoryCard({ department }) {
  const departmentPath = `/c/${department.slug}`
  const tiles = department.children.slice(0, CATEGORY_CARD_TILES).map((category) => ({
    key: category._id,
    to: `/c/${category.slug}`,
    label: category.name,
    image: category.image,
  }))
  if (tiles.length < CATEGORY_CARD_TILES) {
    tiles.push({
      key: `${department._id}-all`,
      to: departmentPath,
      label: `See all ${department.name}`,
      image: department.image,
    })
  }

  return (
    <section className="flex h-full flex-col bg-white px-5 pt-5 pb-4">
      <h2 className="mb-3 text-xl font-bold">{department.name}</h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
        {tiles.map(({ key, ...tile }) => (
          <Tile key={key} {...tile} />
        ))}
      </ul>
      <Link
        to={departmentPath}
        className="mt-auto pt-4 text-sm text-link hover:text-link-hover hover:underline"
      >
        Shop all {department.name}
      </Link>
    </section>
  )
}
