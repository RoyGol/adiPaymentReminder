export default function SessionsLoading() {
  return (
    <main className="px-4 pt-5 pb-4" dir="rtl">
      {/* Stats bar skeleton */}
      <div className="flex gap-2 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-1 bg-card rounded-xl p-3 text-center">
            <div className="skeleton-text skeleton-text--lg mx-auto mb-1" />
            <div className="skeleton-text skeleton-text--sm mx-auto" />
          </div>
        ))}
      </div>

      {/* Sync button skeleton */}
      <div className="flex justify-end mb-3">
        <div className="skeleton-text" style={{ width: 90, height: 28, borderRadius: 8 }} />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2 mb-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-pill" />
        ))}
      </div>

      {/* Session rows skeleton */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </main>
  )
}
