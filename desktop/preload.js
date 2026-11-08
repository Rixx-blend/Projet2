// Pont sécurisé entre l'interface (Next.js) et la coquille Electron.
// Expose uniquement les fonctions de mise à jour : aucun accès Node côté page.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("orderboardUpdater", {
  getState: () => ipcRenderer.invoke("updater:get-state"),
  check: () => ipcRenderer.invoke("updater:check"),
  download: () => ipcRenderer.invoke("updater:download"),
  install: () => ipcRenderer.invoke("updater:install"),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("updater:state", listener);
    return () => ipcRenderer.removeListener("updater:state", listener);
  },
});

// Planches partagées : connexion Google dans une fenêtre dédiée.
contextBridge.exposeInMainWorld("rixxLive", {
  login: (returnPath) => ipcRenderer.invoke("live:login", returnPath),
  token: () => ipcRenderer.invoke("live:token"),
});
