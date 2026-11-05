// OrderBoard — coquille de bureau.
//
// Lance le serveur Next.js embarqué (sans fenêtre) sur un port libre de la
// boucle locale, puis affiche l'application dans une fenêtre native.
// Aucun navigateur, aucun compte, aucune connexion réseau requise.

const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const updater = require("./updater");

const isDev = !app.isPackaged;
const APP_TITLE = "Rixx Studio";

// Le nom interne reste « OrderBoard » : il détermine le dossier des données (%APPDATA%\OrderBoard).
app.setName("OrderBoard");

let mainWindow = null;
let splashWindow = null;
let serverProcess = null;
let serverPort = 0;
let quitting = false;

const appRoot = isDev ? path.join(__dirname, "..") : app.getAppPath();
const dataDir =
  process.env.ORDERBOARD_DATA_DIR?.trim() ||
  path.join(app.getPath("userData"), "data");
const logDir = path.join(app.getPath("userData"), "logs");
const serverLog = path.join(logDir, "serveur.log");

/** Port libre sur la boucle locale. */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function log(line) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(serverLog, `[${new Date().toISOString()}] ${line}\n`);
  } catch {
    // Journalisation best-effort : ne doit jamais empêcher l'app de démarrer.
  }
}

/** Démarre le serveur Next et attend qu'il réponde. */
async function startServer() {
  fs.mkdirSync(dataDir, { recursive: true });

  serverPort = await findFreePort();
  const nextBin = path.join(appRoot, "node_modules", "next", "dist", "bin", "next");
  const mode = isDev ? "dev" : "start";

  const args = [nextBin, mode, "-p", String(serverPort), "-H", "127.0.0.1"];

  serverProcess = spawn(process.execPath, args, {
    cwd: appRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: isDev ? "development" : "production",
      // En développement, on compile dans un dossier distinct pour ne pas
      // entrer en conflit avec un `npm run dev` déjà lancé dans le projet.
      NEXT_DIST_DIR: isDev ? ".next-electron" : ".next",
      ORDERBOARD_DATA_DIR: dataDir,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  serverProcess.stdout.on("data", (chunk) => log(`[next] ${chunk.toString().trim()}`));
  serverProcess.stderr.on("data", (chunk) => log(`[next:err] ${chunk.toString().trim()}`));
  serverProcess.on("exit", (code) => {
    log(`[next] processus terminé (code ${code})`);
    if (!quitting) {
      dialog.showErrorBox(
        "OrderBoard s'est arrêté",
        `Le serveur interne a quitté (code ${code}).\n\nDétails : ${serverLog}`,
      );
      app.quit();
    }
  });

  const baseUrl = `http://127.0.0.1:${serverPort}`;
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/dashboard`, { redirect: "manual" });
      if (response.status < 500) return baseUrl;
    } catch {
      // Pas encore prêt.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(
    "Le serveur interne n'a pas répondu dans le délai imparti. Voir " + serverLog,
  );
}

/** Ouvre un fichier de commande avec l'application par défaut de Windows. */
async function openFileWithSystemApp(url) {
  try {
    const response = await fetch(url);
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

    const rawName = decodeURIComponent(url.split("/").pop() || "fichier");
    const target = path.join(
      app.getPath("temp"),
      "orderboard",
      `${Date.now()}-${rawName.replace(/[\\/:*?"<>|]+/g, "-")}`,
    );
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(target));

    const error = await shell.openPath(target);
    if (error) shell.showItemInFolder(target);
  } catch (error) {
    dialog.showErrorBox(
      "Ouverture impossible",
      `Le fichier n'a pas pu être ouvert.\n\n${String(error)}`,
    );
  }
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 300,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: "#0b0c12",
    show: false,
    center: true,
    alwaysOnTop: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splashWindow.once("ready-to-show", () => splashWindow?.show());
  splashWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 15%,#26134b 0%,#0b0c12 65%);color:#f7f4ff;font-family:Inter,Segoe UI,sans-serif}.wrap{text-align:center;width:100%;padding:35px}.logo{margin:auto;width:54px;height:54px;display:grid;place-items:center;border-radius:17px;background:linear-gradient(145deg,#a855f7,#6d28d9);font-size:28px;font-weight:800;box-shadow:0 0 45px #7c3aed66}.name{margin-top:17px;font-size:16px;font-weight:700}.sub{margin-top:6px;color:#9993ad;font-size:12px}.track{height:3px;background:#292438;border-radius:10px;margin-top:26px;overflow:hidden}.bar{height:100%;width:38%;border-radius:10px;background:linear-gradient(90deg,#7c3aed,#c084fc);animation:load 1.25s ease-in-out infinite alternate}@keyframes load{from{transform:translateX(-20%)}to{transform:translateX(190%)}}</style></head><body><main class="wrap"><div class="logo">R</div><div class="name">Rixx Studio</div><div class="sub">Préparation de ton espace de travail…</div><div class="track"><div class="bar"></div></div></main></body></html>`));
}

function createWindow(baseUrl) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0b0c12",
    title: APP_TITLE,
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    splashWindow = null;
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on("did-finish-load", () => {
    log(`[fenêtre] chargée : ${mainWindow?.webContents.getURL()}`);
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      log(`[fenêtre] échec (${errorCode}) ${errorDescription} — ${validatedURL}`);
    },
  );

  // Liens externes : navigateur par défaut. Fichiers de commande : app par défaut.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`${baseUrl}/api/files/`)) {
      void openFileWithSystemApp(url);
      return { action: "deny" };
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // On reste dans l'application : pas de navigation vers l'extérieur.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(baseUrl)) {
      event.preventDefault();
      if (url.startsWith("http")) void shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void mainWindow.loadURL(`${baseUrl}/overview`);
}

function buildMenu() {
  const template = [
    {
      label: "Fichier",
      submenu: [
        {
          label: "Ouvrir le dossier des données",
          click: () => {
            fs.mkdirSync(dataDir, { recursive: true });
            void shell.openPath(dataDir);
          },
        },
        { type: "separator" },
        { role: "quit", label: "Quitter" },
      ],
    },
    {
      label: "Édition",
      submenu: [
        { role: "undo", label: "Annuler" },
        { role: "redo", label: "Rétablir" },
        { type: "separator" },
        { role: "cut", label: "Couper" },
        { role: "copy", label: "Copier" },
        { role: "paste", label: "Coller" },
        { role: "selectAll", label: "Tout sélectionner" },
      ],
    },
    {
      label: "Affichage",
      submenu: [
        { role: "reload", label: "Recharger" },
        { type: "separator" },
        { role: "resetZoom", label: "Taille normale" },
        { role: "zoomIn", label: "Agrandir" },
        { role: "zoomOut", label: "Réduire" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Plein écran" },
        { role: "toggleDevTools", label: "Outils de développement" },
      ],
    },
    {
      label: "Aide",
      submenu: [
        {
          label: "À propos de Rixx Studio",
          click: () => {
            void dialog.showMessageBox({
              type: "info",
              title: "À propos",
              message: `Rixx Studio (OrderBoard) ${app.getVersion()}`,
              detail:
                "Gestion de commandes pour graphistes et artistes indépendants.\n\n" +
                `Données : ${dataDir}`,
              buttons: ["Fermer"],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Une seule instance : évite deux serveurs et deux fenêtres.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    buildMenu();
    createSplash();
    updater.setup({ getWindow: () => mainWindow, log });
    try {
      const baseUrl = await startServer();
      createWindow(baseUrl);
    } catch (error) {
      log(`[erreur] ${String(error)}`);
      dialog.showErrorBox(
        "Démarrage impossible",
        `${String(error)}\n\nJournal : ${serverLog}`,
      );
      app.quit();
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0 && serverPort) {
        createWindow(`http://127.0.0.1:${serverPort}`);
      }
    });
  });

  app.on("before-quit", () => {
    quitting = true;
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}

