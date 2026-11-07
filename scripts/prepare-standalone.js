// Après `next build` : complète le serveur autonome (.next/standalone) avec les
// fichiers statiques et le dossier public, que Next ne copie pas lui-même.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error("[prepare-standalone] .next/standalone/server.js introuvable : lance d'abord `next build`.");
  process.exit(1);
}

function copy(from, to) {
  if (!fs.existsSync(from)) return;
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

copy(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
copy(path.join(root, "public"), path.join(standalone, "public"));
console.log("[prepare-standalone] serveur autonome prêt.");
