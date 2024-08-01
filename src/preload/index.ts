import { ipcRenderer, contextBridge, FileFilter } from "electron"
import { Preferences, Theme, preferencesStore } from "../common/preferences";

const PreferencesAPI = {
  get: <T extends keyof Preferences>(key: T): Promise<Preferences[T]> => ipcRenderer.invoke("preferences:get", key),
  set: <T extends keyof Preferences>(key: T, value: Preferences[T]) => ipcRenderer.send("preferences:set", key, value),
  addChangeListener: <T extends keyof Preferences>(key: T, consumer: (valueNew: Preferences[T], valueOld: Preferences[T] | undefined) => void) => { 
    ipcRenderer.on(`preferences:change:${key}`, (_event, valueNew, valueOld) => consumer(valueNew, valueOld));
  },
}

export const API = {
  preferences: PreferencesAPI,
  showWindow: (win: string) => ipcRenderer.send('show-window', win),
  //openPage: (page: string) => ipcRenderer.send('open-page', page),
  showModal: (params: ModalParams) => ipcRenderer.send("show-modal", params),
  hideModal: () => ipcRenderer.send("hide-modal"),
  getModalParams: (): Promise<ModalParams> => ipcRenderer.invoke("get-modal-params"),
  setTheme: (theme: Theme) => ipcRenderer.send("set-color-scheme", theme),
  setActivityDetection: (enabled: boolean) => ipcRenderer.send("set-activity-detection", enabled),
  resetActivityDetection: () => ipcRenderer.send("reset-activity-detection"),
  addSingleActivityTrackingListener: (consumer: () => void) => ipcRenderer.once("continuous-activity", consumer),
  getUserPath: (): Promise<string> => ipcRenderer.invoke("get-user-path"),
  readUserDirectory: (path: string) : Promise<string[]> => ipcRenderer.invoke("read-user-directory", path),
  readFile: (path: string): Promise<string> => ipcRenderer.invoke("read-file", path),
  readHtmlFile: (fileName: string): Promise<string> => ipcRenderer.invoke("read-html-file", fileName),
  showFileDialog: (validExtensions: FileFilter[]): Promise<Electron.OpenDialogReturnValue> => ipcRenderer.invoke("open-file-dialog", validExtensions),
  copyFile: (source: string, destination: string): Promise<boolean> => ipcRenderer.invoke("copy-file", source, destination),
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

  if(!window.sessionStorage.getItem("current-page"))
    window.sessionStorage.setItem("current-page", "index");
});