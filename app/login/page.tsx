'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  async function signIn() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
      },
    })
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6" dir="rtl">
      <div className="text-4xl mb-4">📅</div>
      <h1 className="text-white text-2xl font-bold mb-2">ברוכה הבאה, עדי</h1>
      <p className="text-gray-400 text-sm text-center mb-8 leading-relaxed">
        חברי את יומן Google שלך כדי שהאפליקציה<br />תוכל לזהות פגישות אוטומטית
      </p>
      <button
        onClick={signIn}
        disabled={loading}
        className={`w-full max-w-xs bg-blue-600 text-white rounded-xl py-4 text-base font-medium disabled:opacity-70 ${loading ? 'btn-loading' : ''}`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="spinner" />
            מתחבר...
          </span>
        ) : (
          '🔗 חיבור Google Calendar'
        )}
      </button>
    </div>
  )
}
