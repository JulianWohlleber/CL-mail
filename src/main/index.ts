import { app, BrowserWindow, shell, nativeTheme, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './services/database/connection'
import { registerAllIpcHandlers } from './ipc/router'
import { SyncManager } from './services/sync/sync-manager'
import { SnoozeScheduler } from './services/snooze/snooze-scheduler'
import { services } from './services/registry'
import { setupMenu } from './menu'
import { IPC } from '@shared/ipc-channels'

// Prevent EPIPE and other connection errors from crashing the app
process.on('uncaughtException', (err) => {
  if (err.message?.includes('EPIPE') || err.message?.includes('ECONNRESET') || err.message?.includes('ETIMEDOUT')) {
    console.warn('[Main] Connection error (non-fatal):', err.message)
    return
  }
  console.error('[Main] Uncaught exception:', err)
})

let mainWindow: BrowserWindow | null = null
let syncManager: SyncManager | null = null
let snoozeScheduler: SnoozeScheduler | null = null

function createWindow(): void {
  const iconPath = join(__dirname, '../../resources/icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  if (process.platform === 'darwin') {
    app.dock.setIcon(icon)
  }
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: nativeImage.createFromPath(iconPath),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1a1a1a' : '#fafaf8',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.mailspace.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Init database
  const db = initDatabase()

  // Register IPC handlers
  const ipcResources = registerAllIpcHandlers(db)

  // Start sync manager
  syncManager = new SyncManager(db)
  services.setSyncManager(syncManager)
  syncManager.startAll()

  // Refresh the calendar list once on startup so the "Accept invite into …"
  // picker has fresh entries. We deliberately do NOT sync events — mail_ only
  // accepts invites; it does not display a calendar.
  ipcResources.calendarSync.refreshAll().catch((e) => {
    console.warn('[Calendar] initial discovery failed:', (e as Error).message)
  })

  // Allow renderer to trigger sync for a new account
  ipcMain.handle(IPC.SYNC_START, async (_event, accountId?: string) => {
    if (accountId) {
      await syncManager?.startAccount(accountId)
    } else {
      await syncManager?.startAll()
    }
    return { success: true }
  })

  ipcMain.handle(IPC.SYNC_STATUS, () => {
    return { running: true }
  })

  // Create a new IMAP folder for an account
  ipcMain.handle(IPC.FOLDERS_CREATE, async (_event, accountId: string, name: string) => {
    try {
      let client = syncManager?.getClient(accountId) || null
      if (!client) {
        // Account sync not running — start it so we have an IMAP client
        await syncManager?.startAccount(accountId)
        client = syncManager?.getClient(accountId) || null
      }
      if (!client) return { success: false, error: 'No IMAP client for account' }

      const folder = await client.createFolder(name)
      return { success: true, folder }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Start snooze scheduler
  snoozeScheduler = new SnoozeScheduler(db)
  snoozeScheduler.start()

  // Setup native menu
  setupMenu()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  syncManager?.stopAll()
  snoozeScheduler?.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
