import { API } from '../preload/index.js'

declare global {
    interface Window { api: typeof API }
}