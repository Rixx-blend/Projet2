import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSync } from "@tldraw/sync";
import { Tldraw, atom, type TLUser } from "tldraw";

type User = { sub: string; name: string; picture?: string };

const COLORS = ["#B5CEA5", "#F2B45B", "#7C6CF0", "#FF647C", "#5EC1E0", "#E6A1D8"];
const colorFor = (sub: string) => COLORS[[...sub].reduce((total, char) => total + char.charCodeAt(0), 0) % COLORS.length];
const LICENSE_KEY = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string | undefined;

// Images : stockées dans la planche elle-même (ligne de données), suffisant pour un usage à deux.
const assets = {
  upload: (_asset: unknown, file: File) =>
    new Promise<{ src: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ src: String(reader.result) });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }),
  resolve: (asset: { props: { src?: string | null } }) => asset.props.src ?? null,
};

function userStore(user: User) {
  const me = { id: `user:${user.sub}`, typeName: "user", name: user.name, color: colorFor(user.sub), imageUrl: "", meta: {} } as unknown as TLUser;
  return { currentUser: atom("currentUser", me), resolve: () => atom("resolveUser", null) };
}

function SharedBoard({ id, user }: { id: string; user: User }) {
  const users = useMemo(() => userStore(user), [user.sub, user.name]);
  const store = useSync({
    uri: `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/connect/${id}`,
    assets,
    users,
  });

  if (store.status === "error") {
    return <Gate id={id} message="La connexion à la planche a échoué. Reconnecte-toi avec Google." />;
  }
  if (store.status !== "synced-remote") {
    return <p style={{ padding: 24, fontFamily: "system-ui", color: "#DEDFDD", background: "#222423", minHeight: "100vh" }}>Connexion à la planche…</p>;
  }
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <OpenInApp id={id} style={{ position: "absolute", top: 12, right: 12, zIndex: 1000 }} />
      <Tldraw
        store={store.store}
        licenseKey={LICENSE_KEY}
        onMount={(editor) => editor.user.updateUserPreferences({ colorScheme: "dark" })}
      />
    </div>
  );
}

// Lien vers l'application installée (ou son téléchargement si elle ne l'est pas encore).
const DOWNLOAD_URL = "https://github.com/Rixx-blend/Projet2/releases/latest";

function OpenInApp({ id, style }: { id: string; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, ...style }}>
      <a href={`rixxstudio://b/${id}`} style={{ padding: "8px 14px", borderRadius: 10, background: "#252726", color: "#DEDFDD", border: "1px solid #343735", textDecoration: "none", fontSize: 13 }}>Ouvrir dans Rixx Studio</a>
      <a href={DOWNLOAD_URL} style={{ color: "#8E918E", fontSize: 11 }}>Pas encore installée ? Télécharger</a>
    </div>
  );
}

function Gate({ id, message }: { id: string; message: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#222423", color: "#DEDFDD", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center", maxWidth: 360, padding: 24 }}>
        <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Planche partagée</h1>
        <p style={{ color: "#BFC2BE", fontSize: 14 }}>{message}</p>
        <a href={`/auth/login?return=/b/${id}`} style={{ display: "inline-block", marginTop: 12, padding: "10px 16px", borderRadius: 10, background: "#B5CEA5", color: "#222423", fontWeight: 600, textDecoration: "none" }}>Se connecter avec Google</a>
        <div style={{ marginTop: 16 }}><OpenInApp id={id} /></div>
      </div>
    </div>
  );
}

export function LivePlanche({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return <p style={{ padding: 24, fontFamily: "system-ui" }}>Vérification de la connexion…</p>;
  if (!user) return <Gate id={id} message="Connecte-toi avec ton compte Google pour rejoindre cette planche." />;
  return <SharedBoard id={id} user={user} />;
}
