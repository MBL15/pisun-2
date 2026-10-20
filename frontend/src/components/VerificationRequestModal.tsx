import { BadgeCheck, Paperclip } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { usersApi } from '../api/endpoints'
import type { VerificationRequest } from '../api/types'
import { useToast } from './Toast'
import { Button, Field, Modal } from './ui'

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function VerificationRequestModal({
  open,
  onClose,
  onSubmitted,
  latest,
}: {
  open: boolean
  onClose: () => void
  onSubmitted: (req: VerificationRequest) => void
  latest: VerificationRequest | null
}) {
  const { notify } = useToast()
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<{ fileName: string; contentBase64: string }[]>([])
  const [busy, setBusy] = useState(false)

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list?.length) return
    const next = [...files]
    for (const file of Array.from(list).slice(0, 5 - next.length)) {
      next.push({ fileName: file.name, contentBase64: await readFile(file) })
    }
    setFiles(next)
    e.target.value = ''
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      notify('error', 'Расскажите, почему вам нужна галочка')
      return
    }
    setBusy(true)
    try {
      const saved = await usersApi.submitVerification({ message: message.trim(), attachments: files })
      notify('success', 'Заявка отправлена администратору')
      onSubmitted(saved)
      onClose()
    } catch (err) {
      notify('error', 'Не удалось отправить', (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Заявка на галочку" onClose={onClose}>
      {latest?.status === 'PENDING' && (
        <p className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          У вас уже есть заявка на рассмотрении от {new Date(latest.createdAt).toLocaleString('ru-RU')}.
        </p>
      )}
      {latest?.status === 'REJECTED' && latest.rejectionReason && (
        <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          Предыдущая заявка отклонена: {latest.rejectionReason}
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">
          Проверенные организаторы публикуют мероприятия сразу, без ручной придержки администратором (как клубы). Приложите
          документы по желанию — например, ссылку на соцсети или скан справки.
        </p>
        <Field label="Почему вы должны получить галочку?">
          <textarea
            className="input min-h-32"
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Опыт организации, ссылки, отзывы участников…"
          />
        </Field>
        <Field label="Документы (необязательно)" hint="До 5 файлов, PDF или изображения">
          <label className="lift flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-ink px-4 py-3 font-semibold">
            <Paperclip className="size-5" />
            Прикрепить файлы
            <input type="file" className="hidden" multiple accept="image/*,.pdf" onChange={onFiles} />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 text-sm text-muted">
              {files.map((f) => (
                <li key={f.fileName}>{f.fileName}</li>
              ))}
            </ul>
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={busy} icon={<BadgeCheck className="size-5" />} disabled={latest?.status === 'PENDING'}>
            Отправить на проверку
          </Button>
        </div>
      </form>
    </Modal>
  )
}
