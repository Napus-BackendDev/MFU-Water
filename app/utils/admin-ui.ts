// Shared admin control styles, taken from the S5 / S5.1 / S5.2 mockups.
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7]'

const pillBase = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition'
const pillIdle = 'border-slate-200 bg-white text-slate-600 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-300'

export const pillClass = (active: boolean) => [
  pillBase,
  focusRing,
  'cursor-pointer',
  active ? 'border-[#0284C7] bg-[#0284C7] text-white' : `${pillIdle} hover:border-slate-300 hover:text-slate-900 dark:hover:text-white`,
]

export const selectPillClass = [pillBase, pillIdle, 'focus-within:border-[#0284C7]']
export const selectInPillClass = 'max-w-40 cursor-pointer bg-transparent field-sizing-content font-semibold text-slate-900 outline-none dark:text-white dark:[&>option]:bg-[#1E1E1E]'

export const searchFieldClass = 'w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white dark:placeholder:text-[#98A2A8]'

export const actionButtonClass = `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-100 dark:hover:bg-[#252525] cursor-pointer ${focusRing}`

export const primaryButtonClass = `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#0284C7] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#0369A1] disabled:opacity-50 cursor-pointer ${focusRing}`

export const adminCardClass = 'rounded-2xl border border-slate-200 bg-white dark:border-[#2C2C2E] dark:bg-[#1E1E1E]'

export const fieldClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[#0284C7] focus:bg-white dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white dark:placeholder:text-[#98A2A8] dark:focus:bg-[#141416]'
export const fieldLabelClass = 'mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300'
