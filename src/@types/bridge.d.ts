import { API } from '../preload/preload'

declare global {
    interface Window { api: typeof API }
}