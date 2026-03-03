import { savingOverlay, mutedFg } from './styles'

export function SavingOverlay() {
  return (
    <div
      className="absolute inset-0 rounded-[inherit] flex items-center justify-center z-10"
      style={savingOverlay}
      aria-live="polite"
      aria-busy="true"
    >
      <span className="text-sm font-serif" style={mutedFg}>
        Reprocessing…
      </span>
    </div>
  )
}
