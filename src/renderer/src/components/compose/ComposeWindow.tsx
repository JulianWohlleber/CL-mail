import { useState, useRef, useEffect } from 'react'
import { useUIStore } from '../../stores/ui.store'
import { useAccountsStore } from '../../stores/accounts.store'
import { useMailStore } from '../../stores/mail.store'
import { ScheduleSendPopover } from './ScheduleSendPopover'
import { RecipientInput } from './RecipientInput'
import { formatDate } from '../../lib/date-utils'
import { sanitizeHtml } from '../../lib/html-sanitizer'

function buildSigHtml(sig: any): string {
  const lines: string[] = []
  if (sig.name) lines.push(`<strong>${sig.name}</strong>`)
  if (sig.title) lines.push(`<span style="color:#888">${sig.title}</span>`)
  const contact: string[] = []
  if (sig.email) contact.push(`E: <a href="mailto:${sig.email}">${sig.email}</a>`)
  if (sig.phone) contact.push(`P: ${sig.phone}`)
  if (sig.website) {
    const url = sig.website.startsWith('http') ? sig.website : `https://${sig.website}`
    contact.push(`W: <a href="${url}">${sig.website}</a>`)
  }
  if (contact.length > 0) lines.push(contact.join('<br/>'))
  if (sig.html) lines.push(sig.html)
  return lines.join('<br/>')
}

export function ComposeWindow() {
  const closeCompose = useUIStore((s) => s.closeCompose)
  const composeMode = useUIStore((s) => s.composeMode)
  const composeReplyToId = useUIStore((s) => s.composeReplyToId)
  const showUndoToast = useUIStore((s) => s.showUndoToast)
  const accounts = useAccountsStore((s) => s.accounts)
  const selectedThread = useMailStore((s) => s.selectedThread)

  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '')
  const [to, setTo] = useState<string[]>([])
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [signatureHtml, setSignatureHtml] = useState('')
  const [allSignatures, setAllSignatures] = useState<Record<string, any>>({})
  const [selectedSigId, setSelectedSigId] = useState<string>('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [originalMessage, setOriginalMessage] = useState<any>(null)
  const [aiDrafting, setAiDrafting] = useState(false)
  const [aiError, setAiError] = useState('')
  const toRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const fromAccount = accounts.find((a) => a.id === fromAccountId) || accounts[0]

  // Load signatures
  useEffect(() => {
    window.api.getSettings().then((s: any) => {
      const sigs = s?.signatures || {}
      setAllSignatures(sigs)
      // Find default signature
      const defaultEntry = Object.entries(sigs).find(([, sig]: [string, any]) => sig.isDefault)
      if (defaultEntry) {
        setSelectedSigId(defaultEntry[0])
        setSignatureHtml(buildSigHtml(defaultEntry[1] as any))
      }
    })
  }, [])

  const handleSigChange = (sigId: string) => {
    setSelectedSigId(sigId)
    if (sigId === '') {
      setSignatureHtml('')
    } else {
      const sig = allSignatures[sigId]
      if (sig) setSignatureHtml(buildSigHtml(sig))
    }
  }

  // Auto-select the right "from" account based on which account received the thread
  useEffect(() => {
    if (selectedThread && composeMode !== 'new') {
      // Try to match by accountId
      const threadAccountId = selectedThread.accountId
      const matchingAccount = accounts.find((a) => a.id === threadAccountId)
      if (matchingAccount) {
        setFromAccountId(matchingAccount.id)
      }
    }
  }, [selectedThread, composeMode, accounts])

  // Load original message for reply/forward and pre-fill fields
  useEffect(() => {
    if (composeReplyToId && composeMode !== 'new' && selectedThread) {
      const messages = selectedThread.messages || []
      const lastMsg = messages[messages.length - 1]
      if (lastMsg) {
        setOriginalMessage(lastMsg)

        // Pre-fill subject
        const subj = selectedThread.subject || ''
        if (composeMode === 'forward') {
          setSubject(subj.startsWith('Fwd:') ? subj : `Fwd: ${subj}`)
        } else {
          setSubject(subj.startsWith('Re:') ? subj : `Re: ${subj}`)
        }

        // Pre-fill recipients
        if (composeMode === 'reply') {
          setTo([lastMsg.from?.address || ''].filter(Boolean))
        } else if (composeMode === 'reply-all') {
          setTo([lastMsg.from?.address || ''].filter(Boolean))
          const myEmails = new Set(accounts.map((a) => a.email.toLowerCase()))
          const ccAddrs = [
            ...(lastMsg.to || []).map((a: any) => a.address),
            ...(lastMsg.cc || []).map((a: any) => a.address)
          ].filter((addr: string) => addr && !myEmails.has(addr.toLowerCase()))
          if (ccAddrs.length > 0) {
            setCc(ccAddrs)
            setShowCcBcc(true)
          }
        }
        // Forward: leave To empty

        // Generate AI draft for replies
        if (composeMode === 'reply' || composeMode === 'reply-all') {
          setAiDrafting(true)
          setAiError('')
          const currentFromAccount = accounts.find((a) => a.id === fromAccountId) || accounts[0]
          window.api.draftReply({
            fromName: currentFromAccount?.displayName || currentFromAccount?.email || '',
            fromEmail: currentFromAccount?.email || '',
            originalFrom: lastMsg.from?.name || lastMsg.from?.address || '',
            originalSubject: selectedThread.subject || '',
            originalBody: lastMsg.bodyHtml || lastMsg.bodyText || ''
          }).then((result: any) => {
            setAiDrafting(false)
            if (result.success && result.draft) {
              setBody(result.draft)
            } else if (result.error) {
              setAiError(result.error)
            }
          }).catch(() => {
            setAiDrafting(false)
          })
        }
      }
    }

    if (composeMode === 'new') {
      toRef.current?.focus()
    } else {
      bodyRef.current?.focus()
    }
  }, [composeMode, composeReplyToId])

  const handleSend = () => {
    if (to.length === 0 || sending || !fromAccount) return
    setSending(true)

    const bodyHtml = `<div>${body.replace(/\n/g, '<br/>')}</div>`
    const sigBlock = signatureHtml ? `<br/><div class="email-signature" style="margin-top:16px;padding-top:12px;border-top:1px solid #e0e0e0">${signatureHtml}</div>` : ''

    // Fire the send in the background — don't make the user wait for SMTP.
    // The window animates closed immediately; success/failure surfaces via the
    // UndoToast and (on failure) is left for the user to retry from drafts.
    const sendPromise = window.api.sendMail({
      accountId: fromAccount.id,
      from: fromAccount.email,
      to,
      cc,
      bcc,
      subject,
      html: bodyHtml + sigBlock,
      text: body + (signatureHtml ? '\n\n--\n' + signatureHtml.replace(/<[^>]*>/g, '') : '')
    })

    // Trigger the closing animation, then unmount after it finishes.
    setClosing(true)
    setTimeout(() => closeCompose(), 200)

    // When the send eventually resolves, show the undo toast (mounted outside
    // this component, so it survives the unmount).
    sendPromise
      .then((result: any) => {
        if (result?.messageId) showUndoToast('Message sent', result.messageId)
      })
      .catch(() => {
        showUndoToast('Failed to send message', '')
      })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeCompose()
    }
  }

  const modeLabel =
    composeMode === 'reply' ? 'Reply' :
    composeMode === 'reply-all' ? 'Reply All' :
    composeMode === 'forward' ? 'Forward' : 'New Message'

  const isReplyOrForward = composeMode !== 'new' && originalMessage
  const canSend = to.length > 0 && !sending

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={closeCompose}>
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(0,0,0,0.25)',
          opacity: closing ? 0 : 1,
          transition: 'opacity 200ms ease-out'
        }}
      />
      <div
        className="relative w-[640px] max-h-[85vh] rounded-lg shadow-overlay flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--paper-overlay)',
          border: '1px solid var(--border)',
          opacity: closing ? 0 : 1,
          transform: closing ? 'scale(0.97) translateY(4px)' : 'scale(1) translateY(0)',
          transition: 'opacity 200ms ease-out, transform 200ms ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>{modeLabel}</span>
          <button
            onClick={closeCompose}
            className="w-[24px] h-[24px] flex items-center justify-center rounded"
            style={{ fontSize: '14px', color: 'var(--ink-tertiary)' }}
          >
            ✕
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-2 space-y-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {/* From account selector */}
          {accounts.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="font-mono w-[32px] shrink-0" style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>From</label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="flex-1 bg-transparent outline-none py-1 cursor-pointer"
                style={{
                  fontSize: '14px',
                  color: 'var(--ink)',
                  border: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 4px center',
                  paddingRight: '24px'
                }}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.email}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="font-mono w-[32px] shrink-0" style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>To</label>
            <RecipientInput
              value={to}
              onChange={setTo}
              placeholder="recipient@example.com"
              autoFocus={composeMode === 'new'}
              inputRef={toRef}
            />
            {!showCcBcc && (
              <button
                onClick={() => setShowCcBcc(true)}
                className="font-mono shrink-0"
                style={{ fontSize: '11px', color: 'var(--ink-tertiary)' }}
              >
                Cc/Bcc
              </button>
            )}
          </div>
          {showCcBcc && (
            <>
              <div className="flex items-center gap-2">
                <label className="font-mono w-[32px] shrink-0" style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>Cc</label>
                <RecipientInput value={cc} onChange={setCc} />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-mono w-[32px] shrink-0" style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>Bcc</label>
                <RecipientInput value={bcc} onChange={setBcc} />
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <label className="font-mono w-[32px] shrink-0" style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>Sub</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 bg-transparent outline-none py-1"
              style={{ fontSize: '14px', color: 'var(--ink)' }}
              placeholder="Subject"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-5 py-3 overflow-y-auto">
          {aiDrafting && (
            <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded" style={{ backgroundColor: 'var(--paper-raised)' }}>
              <span className="text-xs animate-pulse" style={{ color: 'var(--ink-tertiary)' }}>AI is drafting a reply...</span>
            </div>
          )}
          {aiError && (
            <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded" style={{ backgroundColor: 'var(--paper-raised)' }}>
              <span className="text-xs" style={{ color: 'var(--danger)' }}>{aiError}</span>
            </div>
          )}
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full bg-transparent outline-none resize-none"
            style={{
              fontSize: '15px',
              color: 'var(--ink)',
              fontFamily: 'var(--font-sans)',
              lineHeight: '1.7',
              minHeight: isReplyOrForward ? '120px' : '240px'
            }}
            placeholder="Write your message..."
          />

          {/* Signature preview */}
          {signatureHtml && (
            <div
              className="mt-4 pt-3"
              style={{
                borderTop: '1px solid var(--border)',
                fontSize: '13px',
                color: 'var(--ink-secondary)',
                opacity: 0.7
              }}
              dangerouslySetInnerHTML={{ __html: signatureHtml }}
            />
          )}

          {/* Original message preview */}
          {isReplyOrForward && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="mb-2" style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>
                On {formatDate(originalMessage.date)}, {originalMessage.from?.name || originalMessage.from?.address} wrote:
              </div>
              <div
                className="pl-3"
                style={{
                  borderLeft: '3px solid var(--border-strong)',
                  fontSize: '13px',
                  color: 'var(--ink-secondary)',
                  lineHeight: '1.6',
                  maxHeight: '200px',
                  overflow: 'hidden'
                }}
              >
                {originalMessage.bodyHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(originalMessage.bodyHtml) }} />
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{originalMessage.bodyText}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--ink-tertiary)' }}>
              ⌘↩ to send
            </div>
            <CloudUploadButton onLinkInserted={(line) => setBody((b) => b + (b.endsWith('\n') ? '' : '\n') + line + '\n')} />
            {Object.keys(allSignatures).length > 0 && (
              <select
                value={selectedSigId}
                onChange={(e) => handleSigChange(e.target.value)}
                className="bg-transparent text-xs rounded px-1.5 py-0.5"
                style={{ border: '1px solid var(--border)', color: 'var(--ink-tertiary)' }}
              >
                <option value="">No signature</option>
                {Object.entries(allSignatures).map(([id, sig]: [string, any]) => (
                  <option key={id} value={id}>{sig.name || 'Untitled'}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={closeCompose}
              className="px-3 py-1.5 rounded"
              style={{ fontSize: '14px', color: 'var(--ink-secondary)' }}
            >
              Discard
            </button>
            <div className="relative">
              <div className="flex">
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="px-4 py-1.5 rounded-l font-bold text-white transition-colors"
                  style={{
                    fontSize: '14px',
                    backgroundColor: !canSend ? 'var(--ink-faint)' : 'var(--accent)',
                    cursor: !canSend ? 'not-allowed' : 'pointer'
                  }}
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
                <button
                  onClick={() => setShowSchedule(!showSchedule)}
                  disabled={to.length === 0}
                  className="px-2 py-1.5 rounded-r font-bold text-white transition-colors"
                  style={{
                    fontSize: '14px',
                    backgroundColor: to.length === 0 ? 'var(--ink-faint)' : 'var(--accent)',
                    borderLeft: '1px solid rgba(255,255,255,0.2)',
                    cursor: to.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ▾
                </button>
              </div>
              {showSchedule && (
                <ScheduleSendPopover
                  onSchedule={async (sendAt) => {
                    if (!fromAccount) return
                    await window.api.scheduleSend({
                      accountId: fromAccount.id,
                      sendAt,
                      from: fromAccount.email,
                      to,
                      cc,
                      bcc,
                      subject,
                      html: `<div>${body.replace(/\n/g, '<br/>')}</div>`,
                      text: body
                    })
                    showUndoToast('Send scheduled', '')
                    closeCompose()
                  }}
                  onClose={() => setShowSchedule(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * "Upload to cloud" button for the compose footer. Opens a native file picker,
 * uploads the chosen file to the user's connected cloud storage account
 * (Nextcloud for now), then inserts a Markdown-style link in the body.
 *
 * Why a link instead of an attachment: large files that bounce through SMTP
 * burn quota and often get rejected; a share link is faster and lighter for
 * everyone involved.
 */
function CloudUploadButton({ onLinkInserted }: { onLinkInserted: (line: string) => void }) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(window.api as any).listCloudAccounts().then((rows: any[]) => setAccounts(rows.filter((a) => a.enabled !== 0)))
  }, [])

  if (accounts.length === 0) {
    return (
      <button
        onClick={() => {
          ;(window.api as any).getSettings?.()
          alert('No cloud storage configured.\n\nGo to Settings → Cloud Storage to connect Nextcloud, then come back here to attach files via share links.')
        }}
        className="text-xs"
        style={{ color: 'var(--ink-tertiary)', textDecoration: 'underline' }}
        title="Configure a Nextcloud account in Settings to share large files via link"
      >
        + Cloud file
      </button>
    )
  }

  const handlePick = (accountId: string) => {
    setPickerOpen(false)
    const input = fileInputRef.current
    if (!input) return
    input.dataset.accountId = accountId
    input.click()
  }

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const accountId = e.target.dataset.accountId
    e.target.value = ''
    if (!file || !accountId) return

    // Persist the file to a temp path so the main process can read it.
    setUploading(true)
    try {
      // Electron extends File with `path` for files picked via <input type=file>,
      // which lets the main process read the local file directly without us
      // having to stream the buffer through IPC.
      const path = (file as any).path
      if (!path) throw new Error("Couldn't access local file path")

      const res = await (window.api as any).uploadAttachmentToCloud({
        accountId,
        filePath: path,
        filename: file.name
      })
      if (!res.success) {
        alert('Upload failed: ' + res.error)
        return
      }
      const niceSize = (file.size / 1024 / 1024).toFixed(1) + ' MB'
      onLinkInserted(`📎 ${file.name} (${niceSize}) — ${res.url}`)
    } catch (err) {
      alert('Upload error: ' + (err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChosen}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => (accounts.length === 1 ? handlePick(accounts[0].id) : setPickerOpen((v) => !v))}
        disabled={uploading}
        className="text-xs"
        style={{ color: uploading ? 'var(--ink-faint)' : 'var(--ink-tertiary)', textDecoration: 'underline' }}
        title="Pick a file, upload it to your cloud, paste a share link"
      >
        {uploading ? 'Uploading…' : '+ Cloud file'}
      </button>
      {pickerOpen && (
        <div
          className="absolute bottom-full mb-1 left-0 rounded shadow-overlay py-1 z-50"
          style={{ backgroundColor: 'var(--paper-overlay)', border: '1px solid var(--border)', minWidth: 220 }}
        >
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => handlePick(a.id)}
              className="block w-full text-left px-3 py-1.5 text-xs"
              style={{ color: 'var(--ink)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--paper-raised)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {a.displayName} <span style={{ color: 'var(--ink-tertiary)' }}>· {a.provider}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
