// electron-builder ne copie jamais les dossiers « node_modules » via extraResources.
// Le serveur autonome (resources/server) en a pourtant besoin : on les copie ici,
// après l'assemblage de l'application et avant la création de l'installeur.
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const source = path.join(context.packager.projectDir, ".next", "standalone", "node_modules");
  const target = path.join(context.appOutDir, "resources", "server", "node_modules");

  if (!fs.existsSync(source)) {
    throw new Error(`[after-pack] ${source} introuvable : lance d'abord « npm run build ».`);
  }
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });

  // Le traçage de Next oublie certains fichiers d'exécution (ex. app-route-turbo.runtime.prod.js),
  // que le serveur réclame selon l'environnement : on copie tout le dossier « next-server » (versions prod).
  const runtimeFrom = path.join(context.packager.projectDir, "node_modules", "next", "dist", "compiled", "next-server");
  const runtimeTo = path.join(target, "next", "dist", "compiled", "next-server");
  fs.mkdirSync(runtimeTo, { recursive: true });
  for (const name of fs.readdirSync(runtimeFrom)) {
    if (name.endsWith(".js") && !name.includes(".dev.")) {
      fs.copyFileSync(path.join(runtimeFrom, name), path.join(runtimeTo, name));
    }
  }

  const next = path.join(target, "next", "package.json");
  if (!fs.existsSync(next)) throw new Error("[after-pack] next absent du serveur embarqué.");
  console.log(`[after-pack] node_modules du serveur copiés dans ${target}`);
};
