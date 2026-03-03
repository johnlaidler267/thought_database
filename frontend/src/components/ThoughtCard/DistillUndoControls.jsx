import Tooltip from '../ui/Tooltip'
import { Undo2, Redo2 } from 'lucide-react'
import { iconButtonMuted } from './styles'

export function DistillUndoControls({
  distillationLevel,
  distillationStack,
  distillationForwardStack,
  onRestoreDistill,
  onRedoDistill,
}) {
  const canUndo = distillationLevel > 0 && distillationStack.length > 0
  const canRedo = distillationForwardStack.length > 0

  return (
    <>
      <Tooltip text="Undo" position="bottom">
        <button
          type="button"
          onClick={canUndo ? onRestoreDistill : undefined}
          disabled={!canUndo}
          className="transition-colors flex items-center justify-center p-1 disabled:opacity-40 disabled:cursor-default"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => {
            if (canUndo) iconButtonMuted(e, true)
          }}
          onMouseLeave={(e) => iconButtonMuted(e, false)}
          aria-label="Undo distillation"
        >
          <Undo2 className="w-4 h-4" />
        </button>
      </Tooltip>
      {canRedo && (
        <Tooltip text="Redo" position="bottom">
          <button
            type="button"
            onClick={onRedoDistill}
            className="transition-colors flex items-center justify-center p-1"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => iconButtonMuted(e, true)}
            onMouseLeave={(e) => iconButtonMuted(e, false)}
            aria-label="Redo distillation"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </Tooltip>
      )}
    </>
  )
}
