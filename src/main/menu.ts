import { app, Menu, shell } from 'electron'

export function setupMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences…',
          accelerator: 'Cmd+,',
          click: (_item, window) => {
            window?.webContents.send('navigate', '/settings')
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Message',
          accelerator: 'Cmd+N',
          click: (_item, window) => {
            window?.webContents.send('compose:new')
          }
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find…',
          accelerator: 'Cmd+F',
          click: (_item, window) => {
            window?.webContents.send('search:focus')
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Focus Mode',
          accelerator: 'Cmd+Shift+F',
          click: (_item, window) => {
            window?.webContents.send('toggle:focus-mode')
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Go',
      submenu: [
        {
          label: 'Inbox',
          accelerator: 'Cmd+1',
          click: (_item, window) => {
            window?.webContents.send('navigate:folder', 'inbox')
          }
        },
        {
          label: 'Sent',
          accelerator: 'Cmd+2',
          click: (_item, window) => {
            window?.webContents.send('navigate:folder', 'sent')
          }
        },
        {
          label: 'Drafts',
          accelerator: 'Cmd+3',
          click: (_item, window) => {
            window?.webContents.send('navigate:folder', 'drafts')
          }
        },
        {
          label: 'Archive',
          accelerator: 'Cmd+4',
          click: (_item, window) => {
            window?.webContents.send('navigate:folder', 'archive')
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'Cmd+/',
          click: (_item, window) => {
            window?.webContents.send('show:shortcuts')
          }
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
