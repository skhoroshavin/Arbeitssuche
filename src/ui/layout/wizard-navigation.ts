export function createWizardStepNavigation<TStep extends string>({
  steps,
  currentStep,
  setStep,
  onFinish,
}: CreateWizardStepNavigationProperties<TStep>) {
  const previousStep = getAdjacentWizardStep(steps, currentStep, -1)
  const nextStep = getAdjacentWizardStep(steps, currentStep, 1)

  return createWizardNavigation({
    currentStep,
    firstStep: steps[0],
    lastStep: steps.at(-1),
    previousStep,
    nextStep,
    setStep,
    onFinish,
  })
}

interface CreateWizardStepNavigationProperties<TStep extends string> {
  steps: readonly [TStep, ...TStep[]]
  currentStep: TStep
  setStep: (step: TStep) => void
  onFinish: () => Promise<void>
}

function createWizardNavigation<TStep extends string>({
  currentStep,
  firstStep,
  lastStep,
  previousStep,
  nextStep,
  setStep,
  onFinish,
}: CreateWizardNavigationProperties<TStep>) {
  return {
    onBack:
      currentStep === firstStep
        ? undefined
        : () => {
            setStep(previousStep)
          },
    onNext:
      currentStep === lastStep
        ? undefined
        : () => {
            setStep(nextStep)
          },
    onFinish: currentStep === lastStep ? onFinish : undefined,
  }
}

interface CreateWizardNavigationProperties<TStep extends string> {
  currentStep: TStep
  firstStep: TStep
  lastStep: TStep
  previousStep: TStep
  nextStep: TStep
  setStep: (step: TStep) => void
  onFinish: () => Promise<void>
}

function getAdjacentWizardStep<TStep extends string>(
  steps: readonly TStep[],
  currentStep: TStep,
  direction: -1 | 1,
): TStep {
  const index = steps.indexOf(currentStep)
  return steps[Math.min(Math.max(index + direction, 0), steps.length - 1)]
}
