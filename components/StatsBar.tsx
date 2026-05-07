'use client'
import { useRouter } from 'next/navigation'

interface Props {
  totalDebt: number
  todayCount: number
  unpaidCount: number
}

export function StatsBar({ totalDebt, todayCount, unpaidCount }: Props) {
  const router = useRouter()
  const goToDebtors = () => router.push('/patients?filter=חייבים')

  return (
    <div className="flex gap-2 mb-4">
      <button onClick={goToDebtors} className="flex-1 bg-card rounded-xl p-3 text-center">
        <span className="block text-lg font-bold text-red-400">₪{totalDebt}</span>
        <span className="block text-xs text-gray-400 mt-0.5">חוב כולל</span>
      </button>
      <div className="flex-1 bg-card rounded-xl p-3 text-center">
        <span className="block text-lg font-bold text-green-400">{todayCount}</span>
        <span className="block text-xs text-gray-400 mt-0.5">פגישות היום</span>
      </div>
      <button onClick={goToDebtors} className="flex-1 bg-card rounded-xl p-3 text-center">
        <span className="block text-lg font-bold text-amber-400">{unpaidCount}</span>
        <span className="block text-xs text-gray-400 mt-0.5">לא שילמו</span>
      </button>
    </div>
  )
}
