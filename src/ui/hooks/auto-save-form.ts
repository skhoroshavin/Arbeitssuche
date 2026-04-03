import { useEffect, useRef } from "react"
import {
  useForm,
  type UseFormProps,
  type UseFormReturn,
  type FieldValues,
} from "react-hook-form"
import { useAutoSave, type AutoSaveStatus } from "./internal/auto-save"

export function useAutoSaveForm<TForm extends FieldValues, TData>({
  queryResult: { data, isLoading },
  toFormValues,
  onSave,
  formOptions,
}: UseAutoSaveFormOptions<TForm, TData>): UseFormReturn<TForm> & {
  isLoading: boolean
  saveStatus: AutoSaveStatus
} {
  const form = useForm<TForm>(formOptions)
  const hasLoadedReference = useRef(false)

  const { status: saveStatus, resetBaseline } = useAutoSave({
    control: form.control,
    onSave,
  })

  useEffect(() => {
    if (data && !hasLoadedReference.current) {
      hasLoadedReference.current = true
      form.reset(toFormValues(data))
      resetBaseline()
    }
  }, [data, form.reset, resetBaseline, toFormValues])

  return { ...form, isLoading, saveStatus }
}

export { type AutoSaveStatus } from "./internal/auto-save"

interface UseAutoSaveFormOptions<TForm extends FieldValues, TData> {
  queryResult: { data?: TData; isLoading: boolean }
  toFormValues: (data: TData) => TForm
  onSave: (formData: TForm) => Promise<unknown>
  formOptions?: UseFormProps<TForm>
}
