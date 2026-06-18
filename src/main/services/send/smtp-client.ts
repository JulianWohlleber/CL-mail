import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import Database from 'better-sqlite3'

interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  auth: { user: string; pass: string }
}

export interface OutgoingMessage {
  id: string
  accountId: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  html: string
  text: string
  inReplyTo?: string
  references?: string[]
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
}

export class SmtpClient {
  private transporter: Transporter

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    })
  }

  async send(message: OutgoingMessage): Promise<{ messageId: string }> {
    const result = await this.transporter.sendMail({
      from: message.from,
      to: message.to.join(', '),
      cc: message.cc?.join(', '),
      bcc: message.bcc?.join(', '),
      subject: message.subject,
      html: message.html,
      text: message.text,
      inReplyTo: message.inReplyTo,
      references: message.references?.join(' '),
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType
      }))
    })

    return { messageId: result.messageId }
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch {
      return false
    }
  }
}

// Undo-send outbox queue
export class Outbox {
  private queue: Map<string, { message: OutgoingMessage; timer: ReturnType<typeof setTimeout>; resolve: (v: boolean) => void }> = new Map()
  private undoDelay: number

  constructor(undoDelaySeconds: number = 5) {
    this.undoDelay = undoDelaySeconds * 1000
  }

  enqueue(message: OutgoingMessage, sendFn: (msg: OutgoingMessage) => Promise<void>): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        this.queue.delete(message.id)
        try {
          await sendFn(message)
          resolve(true)
        } catch {
          resolve(false)
        }
      }, this.undoDelay)

      this.queue.set(message.id, { message, timer, resolve })
    })
  }

  cancel(messageId: string): boolean {
    const entry = this.queue.get(messageId)
    if (!entry) return false

    clearTimeout(entry.timer)
    this.queue.delete(messageId)
    entry.resolve(false)
    return true
  }

  setDelay(seconds: number): void {
    this.undoDelay = seconds * 1000
  }
}
