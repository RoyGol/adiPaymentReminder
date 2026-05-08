export default function PatientDetailLoading() {
  return (
    <main className="px-4 pt-5 pb-4" dir="rtl">
      {/* Back button */}
      <div className="skeleton-text" style={{ width: 50, height: 16, marginBottom: 12 }} />

      {/* Patient name */}
      <div className="skeleton-text skeleton-text--lg" style={{ width: 120, marginBottom: 12 }} />

      {/* Rate card skeleton */}
      <div className="skeleton-row" style={{ height: 56, marginBottom: 16, borderRadius: 12 }} />

      {/* Stats row */}
      <div className="flex gap-2 mb-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-1 bg-card rounded-xl p-3 text-center">
            <div className="skeleton-text skeleton-text--lg mx-auto mb-1" />
            <div className="skeleton-text skeleton-text--sm mx-auto" />
          </div>
        ))}
      </div>

      {/* History label */}
      <div className="skeleton-text skeleton-text--sm" style={{ width: 80, marginBottom: 8 }} />

      {/* Session rows */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </main>
  )
}
