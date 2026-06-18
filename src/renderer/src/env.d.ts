/// <reference types="vite/client" />

import type { DeskMailAPI } from '../../preload/index'

declare global {
  interface Window {
    api: DeskMailAPI
  }
}
