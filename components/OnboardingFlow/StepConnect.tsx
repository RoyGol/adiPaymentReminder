'use client'

interface Props {
  onNext: () => void
}

export function StepConnect({ onNext }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-5xl mb-5">📅</div>
      <h1 className="text-white text-2xl font-bold mb-2 text-center">ברוכה הבאה, עדי</h1>
      <p className="text-gray-400 text-sm text-center mb-10 leading-relaxed">
        חברי את יומן Google שלך כדי שהאפליקציה<br />תוכל לזהות פגישות אוטומטית
      </p>
      <button
        onClick={onNext}
        className="w-full max-w-xs bg-blue-600 text-white rounded-xl py-4 text-base font-medium"
      >
        🔗 חיבור Google Calendar
      </button>
    </div>
  )
}
