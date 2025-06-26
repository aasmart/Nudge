import { app, BrowserWindow, Menu, nativeImage, Tray, ipcMain, nativeTheme, dialog, FileFilter } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from "path"
import { Preferences, Theme, preferencesStore } from '../common/preferences';
import fs from "fs"
import { protocol } from "electron";
import { uIOhook } from 'uiohook-napi'
import { ActivityDetection } from './activityDetector';

let tray: any = null;
let win: any = null;
let modal: any = null;

function createTray() {
    const icon = join(__dirname, '../../resources/icon.png')
    const trayicon = nativeImage.createFromPath(icon)
    trayicon.resize({ width: 16 })
    trayicon.setTemplateImage(true)

    tray = new Tray(trayicon)

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Quit App',
            click: () => {
                app.quit(); // actually quit the app.
            }
        },
    ])

    tray.on('click', () => win.show())

    tray.setToolTip(app.name)
    tray.setContextMenu(contextMenu)
}

let activityDetector: ActivityDetection;
const createWindow = () => {
    if (!tray)
        createTray()

    win = new BrowserWindow({
        width: 1000,
        height: 900,
        minWidth: 625,
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
            webSecurity: !is.dev,
            allowRunningInsecureContent: false
        }
    })

    win.maximize();
    loadHtml(win, "index");

    win.once("ready-to-show", () => {
        win.show();
    });

    win.on('before-quit', (_event: any) => {
        uIOhook.stop();
    });

    win.on('close', (event: any) => {
        if (win.quitting) {
            app.quit()
            return;
        }

        event.preventDefault()
        win.hide()
    });

    const locked = app.requestSingleInstanceLock();
    if (!locked) {
        app.quit();
        return;
    }

    app.on("second-instance", () => {
        if (win) {
            if (win.isMinimized())
                win.restore();
            win.show();
            win.focus();
        }
    });

    activityDetector = new ActivityDetection(win);

    createModal();
}

function registerContentSecurity() {
    app.on('web-contents-created', (_, webContents) => {
        webContents.on('will-attach-webview', (event) => {
            event.preventDefault();
        });

        webContents.session.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        "default-src 'self'",
                        "media-src 'self' 'unsafe-inline' 'unsafe-eval' file:",
                        "script-src 'self'",
                        "style-src 'self' 'unsafe-inline'"
                    ],
                },
            });
        });
    });
}

function registerFileProtocol() {
    protocol.registerFileProtocol('file', (request, callback) => {
        try {
            const pathname = decodeURIComponent(request.url.replace('file:///', ''));
            return callback(pathname);
        } catch (err) {
            console.error(err);
        }
    });
}

app.whenReady().then(() => {
    createWindow();
    registerIpcEvents();
    registerFileProtocol();
    registerContentSecurity();

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
    if (is.dev && process.env['ELECTRON_RENDERER_URL'])
        window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${fileName}.html`)
    else
        window.loadFile(join(__dirname, `../renderer/${fileName}.html`))
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
            color: '#ab66eb',
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
        if (win.quitting) {
            app.quit();
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
    modal.setAlwaysOnTop(true);
    modal.show();
    win.show();
}

function registerIpcEvents() {
    ipcMain.on('open-page', (_event: any, name: any) => {
        loadHtml(win, name);
    });
    ipcMain.on('show-window', (_event: any, name: any) => {
        if (name === 'main') win.show()
    });

    ipcMain.handle('app-name', () => app.getName());

    ipcMain.on("show-modal", (_event: any, params: ModalParams) => {
        showModal(params);
    });

    ipcMain.on("hide-modal", (_event: any) => {
        // ipcMain.removeHandler("get-modal-params");
        if (modal)
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

    ipcMain.on("set-activity-detection", (_event: any, enabled: boolean) => {
        if (enabled)
            uIOhook.start();
        else
            uIOhook.stop();
    });

    ipcMain.on("reset-activity-detection", (_event: any) => {
        activityDetector.reset();
    });

    function getUserPath(): string {
        return `${app.getPath("appData")}/nudge/config`;
    }

    ipcMain.handle('get-user-path', (_event: any) => { return getUserPath() });

    ipcMain.handle("read-user-directory", (_event: any, path: string) => {
        try {
            const userPath = getUserPath();
            if (!fs.existsSync(userPath)) {
                fs.mkdirSync(userPath, { recursive: true })
                console.log(`Creating directory: ${userPath}`)
            }

            const targetDirectory = `${getUserPath()}/${path}`;
            if (!fs.existsSync(targetDirectory)) {
                fs.mkdirSync(targetDirectory, { recursive: true })
                console.log(`Creating directory: ${targetDirectory}`)
            }

            return fs.readdirSync(targetDirectory);
        } catch (err) {
            console.error(err)
        }

        return [];
    });

    ipcMain.handle("read-file", (_event: any, path: string) => {
        try {
            return fs.readFileSync(path, 'utf-8');
        } catch (err) {
            console.error(err);
        }
        return "";
    });

    ipcMain.handle("read-renderer-file", (_event: any, fileName: string) => {
        if (is.dev)
            fileName = `src/renderer/${fileName}`
        else
            fileName = join(__dirname, `../renderer/${fileName}`);

        try {
            return fs.readFileSync(fileName, 'utf-8');
        } catch (err) {
            console.error(err);
        }
        return "";
    });

    ipcMain.handle("copy-file", (_event: any, source: string, destination: string) => {
        try {
            fs.copyFile(source, destination, () => { });
            return true;
        } catch (err) {
            return false;
        }
    })

    ipcMain.handle("open-file-dialog", async (_event: any, validExtensions: FileFilter[]) => {
        const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: validExtensions });
        return result;
    })
}
