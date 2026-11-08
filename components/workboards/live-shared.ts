// Éléments communs aux planches partagées (application de bureau et page en direct).
import { atom, type TLUser } from "tldraw";

export const LICENSE_KEY = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY || undefined;

const COLORS = ["#B5CEA5", "#F2B45B", "#7C6CF0", "#FF647C", "#5EC1E0", "#E6A1D8"];
export const colorFor = (sub: string) => COLORS[[...sub].reduce((total, char) => total + char.charCodeAt(0), 0) % COLORS.length];

// Images : stockées dans la planche elle-même (données intégrées), suffisant pour un usage à deux.
export const sharedAssets = {
  upload: (_asset: unknown, file: File) =>
    new Promise<{ src: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ src: String(reader.result) });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }),
  resolve: (asset: { props: { src?: string | null } }) => asset.props.src ?? null,
};

/** Identité de la personne connectée (nom affiché sur son curseur). */
export function sharedUsers(sub: string, name: string, color?: string, picture?: string) {
  const me = { id: `user:${sub}`, typeName: "user", name, color: color || colorFor(sub), imageUrl: picture || "", meta: {} } as unknown as TLUser;
  return { currentUser: atom("currentUser", me), resolve: () => atom("resolveUser", null) };
}

/** Lit le nom et l'identifiant contenus dans le jeton de session (sans le vérifier). */
export function identityFromToken(token: string): { sub: string; name: string } | null {
  try {
    const body = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(atob(body)) as { sub?: string; name?: string };
    return data.sub ? { sub: data.sub, name: data.name || "Invité" } : null;
  } catch {
    return null;
  }
}

declare global {
  interface Window {
    rixxLive?: {
      login: (returnPath: string) => Promise<{ ok: boolean; token: string | null }>;
      token: () => Promise<string | null>;
    };
  }
}
