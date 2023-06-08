"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const API = {
  showWindow: (win) => electron.ipcRenderer.send("show-window", win),
  openPage: (page) => electron.ipcRenderer.send("open-page", page)
};
electron.contextBridge.exposeInMainWorld("api", API);
const replaceText = (selector, text) => {
  const elements = document.getElementsByClassName(selector);
  Array.from(elements).forEach((element) => {
    if (element)
      element.innerText = text;
  });
};
async function setAppName() {
  let name = await electron.ipcRenderer.invoke("app-name");
  const words = name.split("-");
  for (let i = 0; i < words.length; i++)
    words[i] = words[i][0].toUpperCase() + words[i].substring(1);
  replaceText("app-name", words.join(" "));
}
window.addEventListener("DOMContentLoaded", () => {
  for (const dependency of ["chrome", "node", "electron"]) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
  setAppName();
});
exports.API = API;
