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
        if(win == null)
            createWindow()
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
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true,
          preload: path.join(app.getAppPath(), 'src/preload/preload.js')
        }
    })
    
    win.loadFile('src/main/index.html')

    win.on('closed', () => {
        win = null
    })
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    // if(process.platform === '')
    //     app.setSkipTaskbar (true);
    // else
    //     app.dock.hide()
    // if (process.platform !== 'darwin') app.quit()
})


ipcMain.on("popup", () => {
  createPopup()
});
