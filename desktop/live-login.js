// Connexion Google pour les planches partagées.
// Google refuse la connexion dans une fenêtre intégrée : on se connecte donc dans
// le navigateur habituel. Le site renvoie ensuite la session à l'application par
// un petit serveur installé sur la boucle locale (127.0.0.1), éphémère.

const http = require("node:http");
const { ipcMain, shell } = require("electron");

// Même adresse que lib/live-board.ts.
const LIVE_BOARD_BASE = "https://rixx-sync.rixx-studio-sync.workers.dev";
const TIMEOUT_MS = 5 * 60 * 1000;

let liveToken = null;

const page = (title, text) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:system-ui;background:#222423;color:#DEDFDD;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="font-size:20px">${title}</h1><p style="color:#BFC2BE">${text}</p></div></body>`;

function login(returnPath) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname !== "/session") {
        res.writeHead(404).end();
        return;
      }
      const token = url.searchParams.get("token");
      if (!token || token.length > 2000) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" }).end(page("Connexion impossible", "Relance la connexion depuis l'application."));
        return;
      }
      liveToken = token;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(page("Connexion réussie", "Tu peux revenir à Rixx Studio et fermer cet onglet."));
      finish(true);
    });
    let done = false;
    const timer = setTimeout(() => finish(false), TIMEOUT_MS);
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      server.close();
      resolve(ok);
    };
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const target = /^\/b\/[0-9a-f-]{36}$/i.test(String(returnPath)) ? String(returnPath) : "/";
      void shell.openExternal(`${LIVE_BOARD_BASE}/auth/login?return=${encodeURIComponent(target)}&app_port=${port}`);
    });
    server.on("error", () => finish(false));
  });
}

function register() {
  ipcMain.handle("live:login", async (_event, returnPath) => {
    const ok = await login(returnPath);
    return ok ? { ok: true, token: liveToken } : { ok: false, token: null };
  });
  ipcMain.handle("live:token", () => liveToken);
}

module.exports = { register, LIVE_BOARD_BASE };
