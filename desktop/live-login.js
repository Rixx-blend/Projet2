// Connexion Google pour les planches partagées, depuis l'application de bureau.
// La fenêtre de connexion partage la session de l'application : le cookie reçu
// sert ensuite à la synchro en direct. Elle se ferme dès le retour sur le site.

const { BrowserWindow, ipcMain } = require("electron");

// Même adresse que lib/live-board.ts.
const LIVE_BOARD_BASE = "https://rixx-sync.rixx-studio-sync.workers.dev";

// Google refuse la connexion depuis un navigateur intégré qui se présente comme Electron.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

function register() {
  ipcMain.handle("live:login", (_event, returnPath) => {
    const target = /^\/b\/[0-9a-f-]{36}$/i.test(String(returnPath)) ? String(returnPath) : "/";
    return new Promise((resolve) => {
      const win = new BrowserWindow({
        width: 480,
        height: 720,
        title: "Connexion Google",
        autoHideMenuBar: true,
        webPreferences: { contextIsolation: true, nodeIntegration: false },
      });
      let done = false;
      const finish = (connected) => {
        if (done) return;
        done = true;
        resolve(connected);
        if (!win.isDestroyed()) win.close();
      };
      // Retour sur le site après Google : la session est en place.
      const onNavigate = (url) => {
        if (url.startsWith(`${LIVE_BOARD_BASE}/`) && !url.includes("/auth/")) finish(true);
      };
      win.webContents.on("did-navigate", (_event, url) => onNavigate(url));
      win.webContents.on("did-redirect-navigation", (_event, url) => onNavigate(url));
      win.on("closed", () => finish(false));
      void win.loadURL(`${LIVE_BOARD_BASE}/auth/login?return=${encodeURIComponent(target)}`, { userAgent: BROWSER_USER_AGENT });
    });
  });
}

module.exports = { register, LIVE_BOARD_BASE };
