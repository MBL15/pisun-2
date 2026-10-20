import { Download, ExternalLink, Printer } from 'lucide-react'
import { useRef } from 'react'
import { documentsApi } from '../api/endpoints'
import { useAsync } from '../lib/useAsync'
import { Button, ErrorBox, Modal, Spinner } from './ui'

/** Предпросмотр автоматически заполненного заявления/согласия с печатью и скачиванием в один клик. */
export function DocumentDialog({
  open,
  onClose,
  eventId,
  userId,
  childId,
  intro,
}: {
  open: boolean
  onClose: () => void
  eventId: number
  userId: number
  childId?: number
  intro?: string
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const { data, error, loading } = useAsync(
    () => (open ? documentsApi.preview(eventId, userId, childId) : Promise.resolve(undefined)),
    [open, eventId, userId, childId],
  )

  const print = () => frameRef.current?.contentWindow?.print()

  const download = () => {
    if (!data) return
    const blob = new Blob([data.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = data.fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  // Документ отдаётся только авторизованному участнику, поэтому в новой вкладке открываем
  // уже загруженный HTML через blob-ссылку, а не прямой URL без заголовков сессии.
  const openInNewTab = () => {
    if (!data) return
    const blob = new Blob([data.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
  }

  return (
    <Modal open={open} onClose={onClose} title={data?.templateName ?? 'Документ'} wide>
      {intro && <p className="mb-4 rounded-xl bg-pop-green/35 p-4 text-ink">{intro}</p>}
      {loading && <Spinner label="Формируем документ…" />}
      {error && <ErrorBox error={error} />}
      {data && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <Button icon={<Printer className="size-5" />} onClick={print}>
              Печать / PDF
            </Button>
            <Button variant="secondary" icon={<Download className="size-5" />} onClick={download}>
              Скачать
            </Button>
            <button
              type="button"
              onClick={openInNewTab}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-muted hover:bg-pop-yellow/50"
            >
              <ExternalLink className="size-5" />
              Открыть в новой вкладке
            </button>
          </div>
          <iframe
            ref={frameRef}
            title="Предпросмотр документа"
            srcDoc={data.html}
            className="h-[60svh] w-full rounded-2xl border-[3px] border-ink bg-white shadow-md"
          />
        </>
      )}
    </Modal>
  )
}
