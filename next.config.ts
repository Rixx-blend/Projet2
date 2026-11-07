import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // Serveur autonome : Next ne copie que les fichiers réellement utilisés
  // (quelques centaines au lieu de ~22 000 dans node_modules).
  output: "standalone",
  // Le traçage embarquait aussi le dossier « telechargement » (~210 Mo d'exe) et les sources.
  outputFileTracingExcludes: {
    "*": ["telechargement/**", "desktop/**", ".github/**", "dist/**", ".next/cache/**", "**/*.map"],
  },
};

export default nextConfig;
