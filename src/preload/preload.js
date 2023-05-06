"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.API = void 0;
let { ipcRenderer, contextBridge } = require('electron');
exports.API = {
    showWindow: (win) => ipcRenderer.send('show-window', win),
    openPage: (page) => ipcRenderer.send('open-page', page)
};
contextBridge.exposeInMainWorld('api', exports.API);
const replaceText = (selector, text) => {
    const elements = document.getElementsByClassName(selector);
    Array.from(elements).forEach(element => {
        if (element)
            element.innerText = text;
    });
};
function setAppName() {
    return __awaiter(this, void 0, void 0, function* () {
        let name = yield ipcRenderer.invoke('app-name');
        const words = name.split('-');
        for (let i = 0; i < words.length; i++)
            words[i] = words[i][0].toUpperCase() + words[i].substring(1);
        replaceText('app-name', words.join(' '));
    });
}
window.addEventListener('DOMContentLoaded', () => {
    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency]);
    }
    setAppName();
});
