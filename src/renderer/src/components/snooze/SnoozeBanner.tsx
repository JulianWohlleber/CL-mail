import { formatDate } from '../../lib/date-utils'

interface Props {
  wakeAt: number
  threadId: string
}

export function SnoozeBanner({ wakeAt, threadId }: Props) {
  const handleCancel = async () => {
    await window.api.cancelSnooze(threadId)
  }

  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs"
      style={{ backgroundColor: 'var(--warning)', color: 'white' }}
    >
      <span>Snoozed until {formatDate(wakeAt)}</span>
      <button onClick={handleCancel} className="ml-1 underline">
        Cancel
      </button>
    </div>
  )
}
