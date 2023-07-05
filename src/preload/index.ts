import { ipcRenderer, contextBridge } from "electron"

export const API = {
  showWindow: (win: string) => ipcRenderer.send('show-window', win),
  openPage: (page: string) => ipcRenderer.send('open-page', page),
  showModal: (params: ModalParams) => ipcRenderer.send("show-modal", params),
  getModalParams: (): Promise<ModalParams> => ipcRenderer.invoke("get-modal-params"),
}

contextBridge.exposeInMainWorld('api', API)

const replaceText = (selector: any, text: any) => {
  const elements = document.getElementsByClassName(selector) as HTMLCollectionOf<HTMLElement>

  Array.from(elements).forEach(element => {
    if (element) 
      element.innerText = text
  })
}

async function setAppName() {
  let name: string = await ipcRenderer.invoke('app-name')
  const words: Array<string> = name.split('-')

  for(let i = 0; i < words.length; i++)
    words[i] = words[i][0].toUpperCase() + words[i].substring(1)

  replaceText('app-name', words.join(' ')) 
}

window.addEventListener('DOMContentLoaded', () => {
    for (const dependency of ['chrome', 'node', 'electron']) {
      replaceText(`${dependency}-version`, process.versions[dependency])
    }

    setAppName()
})