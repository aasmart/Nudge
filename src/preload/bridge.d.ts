import { API } from './index.js'

declare global {
    interface Window { api: typeof API }
}