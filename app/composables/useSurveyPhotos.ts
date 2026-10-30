import { onBeforeUnmount, ref } from 'vue'
import { validateSurveyPhoto, type SurveyPhoto } from '../../src/lib/survey'

type Pair<T> = [T, T]
type Slot = 0 | 1

// The two optional survey photos: selection, validation and preview URLs.
export function useSurveyPhotos() {
  const photos = ref<Pair<SurveyPhoto>>([null, null])
  const errors = ref<Pair<string | null>>([null, null])
  const previews = ref<Pair<string | null>>([null, null])

  function setPreview(slot: Slot, file: File | null) {
    const old = previews.value[slot]
    if (old) URL.revokeObjectURL(old)
    previews.value[slot] = file ? URL.createObjectURL(file) : null
  }

  function patch<T>(list: Pair<T>, slot: Slot, value: T): Pair<T> {
    const next: Pair<T> = [...list]
    next[slot] = value
    return next
  }

  // Returns true when the file was accepted; a rejected file leaves the slot empty with an error message.
  async function select(slot: Slot, input: HTMLInputElement) {
    const file = input.files?.[0]
    if (!file) return false
    const error = await validateSurveyPhoto(file)
    photos.value = patch(photos.value, slot, error ? null : file)
    errors.value = patch(errors.value, slot, error)
    setPreview(slot, error ? null : file)
    if (error) input.value = ''
    return !error
  }

  function remove(slot: Slot) {
    photos.value = patch(photos.value, slot, null)
    errors.value = patch(errors.value, slot, null)
    setPreview(slot, null)
  }

  const reset = () => ([0, 1] as const).forEach(remove)
  onBeforeUnmount(reset)

  return { photos, errors, previews, select, remove, reset }
}
