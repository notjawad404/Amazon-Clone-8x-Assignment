import StarRating from '../ui/StarRating'

const STARS = [5, 4, 3, 2, 1]

export default function RatingHistogram({ ratingAvg, ratingCount, breakdown }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <StarRating value={ratingAvg} />
        <span className="text-lg">{ratingAvg.toFixed(1)} out of 5</span>
      </div>
      <p className="mt-1 text-sm text-gray-700">
        {ratingCount.toLocaleString('en-US')} global {ratingCount === 1 ? 'rating' : 'ratings'}
      </p>
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">Ratings by star</caption>
        <tbody>
          {STARS.map((star) => {
            const count = breakdown[star] ?? 0
            const percent = ratingCount ? Math.round((count / ratingCount) * 100) : 0
            return (
              <tr key={star}>
                <th scope="row" className="py-1.5 pr-3 text-left font-normal whitespace-nowrap">
                  {star} star
                </th>
                <td className="w-full py-1.5" aria-hidden="true">
                  <div className="h-5 overflow-hidden rounded-sm border border-gray-300 bg-gray-100">
                    <div className="h-full bg-star" style={{ width: `${percent}%` }} />
                  </div>
                </td>
                <td className="py-1.5 pl-3 text-right whitespace-nowrap">
                  {percent}%<span className="sr-only"> ({count} ratings)</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
