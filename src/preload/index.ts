import { ipcRenderer, contextBridge } from "electron"
import { Preferences, preferencesStore } from "../common/preferences";

export const API = {
  showWindow: (win: string) => ipcRenderer.send('show-window', win),
  openPage: (page: string) => ipcRenderer.send('open-page', page),
  showModal: (params: ModalParams) => ipcRenderer.send("show-modal", params),
  hideModal: () => ipcRenderer.send("hide-modal"),
  getModalParams: (): Promise<ModalParams> => ipcRenderer.invoke("get-modal-params"),
  getStoredPreference: <T extends keyof Preferences>(key: T): Promise<Preferences[T]> => ipcRenderer.invoke("get-stored-preference", key),
  setStoredPreference: <T extends keyof Preferences>(key: T, value: Preferences[T]) => ipcRenderer.send("set-stored-preference", key, value)
}

contextBridge.exposeInMainWorld('api', API);

const replaceText = (selector: any, text: any) => {
  const elements = document.getElementsByClassName(selector) as HTMLCollectionOf<HTMLElement>

  Array.from(elements).forEach(element => {
    if (element) 
      element.innerText = text
  });
}

async function setAppName() {
  let name: string = await ipcRenderer.invoke('app-name')
  const words: Array<string> = name.split('-')

  for(let i = 0; i < words.length; i++)
    words[i] = words[i][0].toUpperCase() + words[i].substring(1)

  replaceText('app-name', words.join(' ')) 
}

async function setAppTheme() {
  const theme = preferencesStore.get("theme");
  ipcRenderer.send("set-color-scheme", theme);
}

window.addEventListener('DOMContentLoaded', () => {
    setAppTheme();
    setAppName();
});