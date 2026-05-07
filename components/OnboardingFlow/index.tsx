'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StepConnect } from './StepConnect'
import { StepSync } from './StepSync'
import { StepLinkPatients } from './StepLinkPatients'

type Step = 'connect' | 'sync' | 'link'

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>('connect')
  const [unknownNames, setUnknownNames] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) {
        setStep('sync')
      }
    })
  }, [])

  if (step === 'connect') {
    return <StepConnect onNext={() => setStep('sync')} />
  }
  if (step === 'sync') {
    return (
      <StepSync
        onNext={(names) => {
          setUnknownNames(names)
          setStep('link')
        }}
      />
    )
  }
  return <StepLinkPatients unknownNames={unknownNames} />
}
