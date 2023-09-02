import { app, BrowserWindow, Menu, nativeImage, Tray, ipcMain, nativeTheme } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from "path"
import { Preferences, Theme, preferencesStore } from '../common/preferences';

let tray: any = null;
let win: any = null;
let modal: any = null;

function createTray () {
  const icon = join(__dirname, '../../resources/icon.png')
  const trayicon = nativeImage.createFromPath(icon)
  trayicon.resize({ width: 16 })
  trayicon.setTemplateImage(true)

  tray = new Tray(trayicon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quit App',
      click: () => {
        app.quit() // actually quit the app.
      }
    },
  ])

  tray.on('click', () => win.show())

  tray.setToolTip(app.name)
  tray.setContextMenu(contextMenu)
}

const createWindow = () => {
    if (!tray)
        createTray()

    win = new BrowserWindow({
        width: 1000,
        height: 900,
        minWidth: 550,
        minHeight: 375,
        icon: join(__dirname, '../../resources/icon.png'),
        autoHideMenuBar: true,
        center: true,
        frame: false,
        show: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
          color: '#ab66eb',
          symbolColor: '#ffffff',
        },
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          nodeIntegration: true,
          contextIsolation: true,
        }
    })
    
    win.maximize();
    loadHtml(win, "index");

    win.once("ready-to-show", () => {
      win.show();
    });

    win.on('close', (event: any) => {
        if(win.quitting) {
          win.quit() 
          return;
        }

        event.preventDefault()
        win.hide()
    });

    createModal();
}

app.whenReady().then(() => {
    createWindow();
    registerIpcEvents();

    if (process.platform === 'win32')
          app.setAppUserModelId(app.name);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.setLoginItemSettings({
  openAtLogin: true    
})

app.on('before-quit', () => win.quitting = true)

function loadHtml(window: any, fileName: string) {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${fileName}.html`)
  } else {
    window.loadFile(join(__dirname, `../renderer/${fileName}.html`))
  }
}

function createModal() {
  modal = new BrowserWindow({
    width: 500,
    height: 400,
    minWidth: 350,
    minHeight: 200,
    parent: win,
    modal: true,
    show: false,
    icon: join(__dirname, '../../resources/icon.png'),
    autoHideMenuBar: true,
    center: true,
    frame: false,
    resizable: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#984ae2',
      symbolColor: '#ffffff',
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: true,
      contextIsolation: true,
    }
  });
  loadHtml(modal, "modal");

  modal.on('close', (event: any) => {
    if(win.quitting) {
      win.quit();
      return;
    }

    event.preventDefault();
    modal.hide();
});
}

function showModal(params: ModalParams) {
  ipcMain.removeHandler("get-modal-params");
  ipcMain.handleOnce("get-modal-params", () => params);

  modal.width = params.winWidth ?? modal.width;
  modal.height = params.winHeight ?? modal.height;

  loadHtml(modal, "modal");
  modal.show();
  win.show();
}

function registerIpcEvents() {
  ipcMain.on('open-page', (_event: any, name: any) => {
    loadHtml(win, name);
  });
  
  ipcMain.on('show-window', (_event: any, name: any) => {
    if(name === 'main') win.show()
  });
  
  ipcMain.handle('app-name', () => app.getName());
  
  ipcMain.on("show-modal", (_event: any, params: ModalParams) => {
    showModal(params);
  });
  
  ipcMain.on("hide-modal", (_event: any) => {
    // ipcMain.removeHandler("get-modal-params");
    if(modal)
      modal.hide();
  });
  
  ipcMain.handle("preferences:get", (_event: any, key: keyof Preferences) => {
    return preferencesStore.get(key);
  });
  
  ipcMain.on("preferences:set", <T extends keyof Preferences>(_event: any, key: T, value: Preferences[T]) => {
    preferencesStore.set(key, value);
  });

  Object.keys(preferencesStore.store).forEach(key => {
    preferencesStore.onDidChange(<keyof Preferences>key, (valueNew, valueOld) => {
      win.webContents.send(`preferences:change:${key}`, valueNew, valueOld)
    })
  })

  // Themes
  ipcMain.on("set-color-scheme", (_event: any, theme: Theme) => {
    nativeTheme.themeSource = theme;
  });
}