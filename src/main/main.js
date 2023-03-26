const { app, BrowserWindow, Menu, nativeImage, Tray, ipcMain } = require('electron')
const { platform } = require('os')
const path = require('path')

let tray = null
let win = null

function createTray () {
  const icon = path.join(__dirname, '/app.png') // required.
  const trayicon = nativeImage.createFromPath(icon)
  tray = new Tray(trayicon.resize({ width: 16 }))
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        win.show()
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit() // actually quit the app.
      }
    },
  ])

  tray.setContextMenu(contextMenu)
}

const createWindow = () => {
    if (!tray)
        createTray()

    win = new BrowserWindow({
        width: 800,
        height: 650,
        webPreferences: {
          preload: path.join(app.getAppPath(), 'src/preload/preload.js')
        }
    })
    
    win.loadFile('src/main/index.html')

    win.on('close', (event) => {
        if(app.quitting) {
          win.quit() 
          return;
        }

        event.preventDefault()
        win.hide()
    })

    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url === 'about:blank') {
        win.show()
        return {
          action: 'allow',
        }
      }
      return { action: 'deny' }
    })
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('before-quit', () => app.quitting = true)