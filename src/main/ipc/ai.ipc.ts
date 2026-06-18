import { ipcMain, net } from 'electron'
import { IPC } from '@shared/ipc-channels'

const OLLAMA_URL = 'http://localhost:11434/api/generate'
const DEFAULT_MODEL = 'mistral'

interface DraftRequest {
  fromName: string
  fromEmail: string
  originalFrom: string
  originalSubject: string
  originalBody: string
  language?: string
}

export function registerAiHandlers(): void {
  ipcMain.handle(IPC.AI_DRAFT_REPLY, async (_event, req: DraftRequest) => {
    const { fromName, fromEmail, originalFrom, originalSubject, originalBody } = req

    // Clean HTML tags from body
    const cleanBody = originalBody
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000) // Limit context size

    const prompt = `You are writing an email reply on behalf of ${fromName} (${fromEmail}).

Original email from ${originalFrom}:
Subject: ${originalSubject}
---
${cleanBody}
---

Write a professional, concise reply to this email. Match the tone and language of the original email. If the original is in German, reply in German. If in English, reply in English.

Important rules:
- Do NOT include a subject line
- Do NOT include "Dear..." or greetings if the original didn't use them, otherwise match the style
- Be concise and direct
- Do NOT add a signature (it will be added automatically)
- Just write the body text of the reply, nothing else
- Do not use placeholder text like [Name] - use the actual names provided`

    try {
      const response = await fetchOllama(prompt)
      return { success: true, draft: response }
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('ECONNREFUSED')) {
        return { success: false, error: 'Ollama is not running. Start it with: ollama serve' }
      }
      return { success: false, error: msg }
    }
  })
}

async function fetchOllama(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: DEFAULT_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 500
      }
    })

    const request = net.request({
      method: 'POST',
      url: OLLAMA_URL
    })

    request.setHeader('Content-Type', 'application/json')

    let responseData = ''

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        responseData += chunk.toString()
      })
      response.on('end', () => {
        try {
          const parsed = JSON.parse(responseData)
          resolve(parsed.response || '')
        } catch {
          reject(new Error('Invalid response from Ollama'))
        }
      })
      response.on('error', (err) => reject(err))
    })

    request.on('error', (err) => reject(err))
    request.write(body)
    request.end()
  })
}
