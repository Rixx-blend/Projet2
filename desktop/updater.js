// Mises à jour d'OrderBoard via electron-updater et GitHub Releases.
//
// Sécurité : aucune installation silencieuse à la fermeture. L'utilisateur
// vérifie, télécharge, puis confirme le redémarrage. Les données sont dans
// app.getPath("userData")/data, hors du dossier remplacé par l'installeur.

const { app, ipcMain } = require("electron");

const state = {
  status: "idle",
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
let checkInFlight = false;
let downloadInFlight = false;
let installInFlight = false;
let handlersRegistered = false;
let startupCheckTimer = null;

function publish(patch) {
  Object.assign(state, patch);
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send("updater:state", { ...state });
  }
}

function errorMessage(error) {
  return String(error?.message ?? error ?? "Erreur inconnue").slice(0, 500);
}

function unsupportedReason() {
  if (!app.isPackaged) {
    return "Les mises à jour sont disponibles uniquement dans l'application Windows installée.";
  }
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return "La version portable ne prend pas en charge les mises à jour. Installe la version Setup.";
  }
  return null;
}

function registerHandlers() {
  if (handlersRegistered) return;
  handlersRegistered = true;

  ipcMain.handle("updater:get-state", () => ({ ...state }));

  ipcMain.handle("updater:check", async () => {
    if (!autoUpdater || checkInFlight || downloadInFlight || installInFlight) {
      return { ...state };
    }
    checkInFlight = true;
    publish({ status: "checking", error: null, message: null });
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      publish({ status: "error", error: errorMessage(error) });
    } finally {
      checkInFlight = false;
    }
    return { ...state };
  });

  ipcMain.handle("updater:download", async () => {
    if (!autoUpdater || state.status !== "available" || downloadInFlight || installInFlight) {
      return { ...state };
    }
    downloadInFlight = true;
    publish({ status: "downloading", progress: 0, error: null });
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      publish({ status: "error", error: errorMessage(error) });
    } finally {
      downloadInFlight = false;
    }
    return { ...state };
  });

  ipcMain.handle("updater:install", async () => {
    if (!autoUpdater || state.status !== "ready" || installInFlight) {
      return { ok: false, error: "Aucune mise à jour prête à installer." };
    }

    installInFlight = true;
    publish({
      status: "ready",
      error: null,
      message: "Fermeture sécurisée du logiciel avant installation…",
    });

    try {
      // Ne jamais lancer l'installeur si le serveur local n'a pas été arrêté.
      await beforeInstall();
      log("[maj] Serveur local arrêté. Lancement de l'installation.");
      setImmediate(() => {
        try {
          autoUpdater.quitAndInstall(true, true);
        } catch (error) {
          installInFlight = false;
          publish({ status: "error", error: errorMessage(error), message: null });
        }
      });
      return { ok: true };
    } catch (error) {
      installInFlight = false;
      const message = errorMessage(error);
      log(`[maj:err] Installation annulée : arrêt du serveur impossible : ${message}`);
      publish({
        status: "error",
        error: `Installation annulée : le logiciel n'a pas pu fermer proprement son serveur local. ${message}`,
        message: null,
      });
      return { ok: false, error: message };
    }
  });
}

function setup(options = {}) {
  getWindow = options.getWindow ?? getWindow;
  log = options.log ?? log;
  if (typeof options.beforeInstall === "function") beforeInstall = options.beforeInstall;

  registerHandlers();

  const reason = unsupportedReason();
  if (reason) {
    publish({ status: "unsupported", message: reason });
    return;
  }

  try {
    ({ autoUpdater } = require("electron-updater"));

    // Le téléchargement doit être explicitement demandé depuis Paramètres.
    // Ne jamais installer automatiquement pendant une fermeture normale.
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.logger = {
      info: (message) => log(`[maj] ${message}`),
      warn: (message) => log(`[maj] ${message}`),
      error: (message) => log(`[maj:err] ${message}`),
      debug: () => undefined,
    };

    autoUpdater.on("checking-for-update", () => {
      publish({ status: "checking", error: null });
    });

    autoUpdater.on("update-available", (info) => {
      publish({
        status: "available",
        version: info.version,
        progress: 0,
        error: null,
        message: "Une version est disponible. Le téléchargement ne démarre qu'après confirmation.",
      });
      log(`[maj] Version ${info.version} disponible.`);
    });

    autoUpdater.on("update-not-available", (info) => {
      publish({
        status: "none",
        current: app.getVersion(),
        version: info?.version ?? null,
        progress: 0,
        error: null,
        message: "Aucune mise à jour disponible.",
      });
    });

    autoUpdater.on("download-progress", (progress) => {
      publish({
        status: "downloading",
        progress: Math.max(0, Math.min(100, Math.round(progress.percent || 0))),
        error: null,
      });
    });

    autoUpdater.on("update-downloaded", (info) => {
      publish({
        status: "ready",
        version: info.version,
        progress: 100,
        error: null,
        message: "Téléchargement terminé. Tes données locales sont conservées. Redémarre pour installer.",
      });
      log(`[maj] Version ${info.version} téléchargée et prête.`);
    });

    autoUpdater.on("error", (error) => {
      const message = errorMessage(error);
      log(`[maj:err] ${message}`);
      publish({ status: "error", error: message, message: null });
    });

    // Vérification discrète au démarrage, sans téléchargement ni installation.
    if (startupCheckTimer) clearTimeout(startupCheckTimer);
    startupCheckTimer = setTimeout(() => {
      if (!checkInFlight && !downloadInFlight && !installInFlight) {
        void autoUpdater.checkForUpdates().catch((error) => {
          const message = errorMessage(error);
          log(`[maj:err] Vérification automatique : ${message}`);
          publish({ status: "error", error: message });
        });
      }
    }, 15_000);
    startupCheckTimer.unref?.();
  } catch (error) {
    log(`[maj:err] Initialisation impossible : ${String(error)}`);
    publish({ status: "unsupported", message: "Le module de mise à jour est indisponible dans cette installation." });
  }
}

module.exports = { setup };
