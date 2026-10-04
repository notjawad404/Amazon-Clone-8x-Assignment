export default function AboutThisItem({ bullets }) {
  if (!bullets.length) return null

  return (
    <section aria-labelledby="about-heading">
      <h2 id="about-heading" className="mb-2 text-base font-bold">
        About this item
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </section>
  )
}
