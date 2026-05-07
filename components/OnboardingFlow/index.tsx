'use client'
import { useState } from 'react'
import { StepConnect } from './StepConnect'
import { StepSync } from './StepSync'
import { StepLinkPatients } from './StepLinkPatients'

type Step = 'connect' | 'sync' | 'link'

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>('connect')
  const [unknownNames, setUnknownNames] = useState<string[]>([])

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
