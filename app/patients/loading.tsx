export default function PatientsLoading() {
  return (
    <main className="px-4 pt-5 pb-4" dir="rtl">
      {/* Search input skeleton */}
      <div className="skeleton-row" style={{ height: 40, marginBottom: 12 }} />

      {/* Filter pills skeleton */}
      <div className="flex gap-2 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton-pill" />
        ))}
      </div>

      {/* Patient rows skeleton */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </main>
  )
}
