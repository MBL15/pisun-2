import { useEffect, useState } from 'react'
import { Button, Modal } from './ui'

/** Диалог для действий администратора, где причина обязательна и видна организатору. */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  presets = [],
  danger = true,
  reasonOptional = false,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  presets?: string[]
  danger?: boolean
  reasonOptional?: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setReason('')
      setError(null)
    }
  }, [open])

  const submit = async () => {
    if (!reasonOptional && !reason.trim()) {
      setError('Укажите причину — её увидит пользователь')
      return
    }
    setBusy(true)
    try {
      await onConfirm(reason.trim())
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      {description && <p className="mb-4 text-slate-600">{description}</p>}
      {presets.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className={`rounded-full border-2 border-ink px-3 py-1.5 text-sm font-semibold text-ink transition ${reason === preset ? 'bg-pop-yellow' : 'bg-white hover:bg-pop-yellow/50'}`}
            >
              {preset}
            </button>
          ))}
        </div>
      )}
      <textarea
        className="input min-h-28"
        placeholder="Причина"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        autoFocus
      />
      {error && (
        <p className="mt-3 rounded-md border-2 border-ink bg-pop-red px-3 py-1.5 text-sm font-bold text-ink" role="alert">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={submit}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
