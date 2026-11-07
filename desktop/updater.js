// Mises à jour automatiques d'OrderBoard (electron-updater + GitHub Releases).
//
// Flux : l'appli vérifie s'il existe une release plus récente, l'utilisateur
// clique sur « Télécharger », puis « Redémarrer et installer ». Les données
// (dossier %APPDATA%\OrderBoard\data) ne sont jamais touchées.

const { app, ipcMain } = require("electron");

/** État partagé avec l'interface. */
const state = {
  status: "idle", // idle | checking | available | none | downloading | ready | error | unsupported
  current: app.getVersion(),
  version: null,
  progress: 0,
  error: null,
  message: null,
};

let autoUpdater = null;
let getWindow = () => null;
let log = () => undefined;
let beforeInstall = async () => undefined;

function publish(patch) {
  Object.assign(state, patch);
  const win = getWindow();
  if (win && !win.isDestroyed()) win.webContents.send("updater:state", { ...state });
}

function unsupportedReason() {
  if (!app.isPackaged) return "Les mises à jour ne fonctionnent que dans l'application installée.";
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return "La version portable ne se met pas à jour toute seule. Installe la version « Setup » pour recevoir les mises à jour.";
  }
  return null;
}

function setup(options) {
  getWindow = options.getWindow;
  log = options.log;
  if (options.beforeInstall) beforeInstall = options.beforeInstall;

  const reason = unsupportedReason();
  if (reason) {
    publish({ status: "unsupported", message: reason });
  } else {
    try {
      ({ autoUpdater } = require("electron-updater"));
      autoUpdater.autoDownload = true; // téléchargement automatique en arrière-plan
      autoUpdater.autoInstallOnAppQuit = true; // installation au prochain arrêt de l’application
      autoUpdater.logger = { info: (m) => log(`[maj] ${m}`), warn: (m) => log(`[maj] ${m}`), error: (m) => log(`[maj:err] ${m}`), debug: () => undefined };

      autoUpdater.on("checking-for-update", () => publish({ status: "checking", error: null }));
      autoUpdater.on("update-available", (info) => {
        publish({ status: "available", version: info.version, progress: 0, error: null });
        log(`[maj] Version ${info.version} disponible : téléchargement automatique.`);
      });
      autoUpdater.on("update-not-available", () => publish({ status: "none", version: null, error: null }));
      autoUpdater.on("download-progress", (p) =>
        publish({ status: "downloading", progress: Math.round(p.percent) }),
      );
      autoUpdater.on("update-downloaded", (info) => {
        publish({ status: "ready", version: info.version, progress: 100, message: "Mise à jour prête. Elle sera installée à la fermeture du logiciel." });
        log(`[maj] Version ${info.version} téléchargée : installation à la fermeture.`);
      });
      autoUpdater.on("error", (error) =>
        publish({ status: "error", error: String(error?.message ?? error).slice(0, 300) }),
      );
    } catch (error) {
      log(`[maj:err] ${String(error)}`);
      publish({ status: "unsupported", message: "Module de mise à jour indisponible." });
    }
  }

  ipcMain.handle("updater:get-state", () => ({ ...state }));

  ipcMain.handle("updater:check", async () => {
    if (!autoUpdater) return { ...state };
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      publish({ status: "error", error: String(error?.message ?? error).slice(0, 300) });
    }
    return { ...state };
  });

  ipcMain.handle("updater:download", async () => {
    if (!autoUpdater || state.status !== "available") return { ...state };
    publish({ status: "downloading", progress: 0 });
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      publish({ status: "error", error: String(error?.message ?? error).slice(0, 300) });
    }
    return { ...state };
  });

  ipcMain.handle("updater:install", () => {
    if (!autoUpdater || state.status !== "ready") return;
    // On arrête d'abord le serveur interne : sinon l'installeur attend qu'il se ferme (plusieurs minutes).
    // Installation silencieuse puis relance automatique.
    void beforeInstall()
      .catch((error) => log(`[maj:err] arrêt du serveur : ${String(error)}`))
      .finally(() => setImmediate(() => autoUpdater.quitAndInstall(true, true)));
  });

  // Vérification discrète au démarrage ; téléchargement et installation ensuite automatiques.
  if (autoUpdater) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((error) => log(`[maj:err] ${String(error)}`));
    }, 15_000);
  }
}

module.exports = { setup };
