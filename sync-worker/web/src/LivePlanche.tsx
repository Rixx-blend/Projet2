import { Component, useRef, type ReactNode } from "react";
import { Tldraw, type Editor, type TLAssetStore, type TLStore } from "tldraw";
import { useSync } from "@tldraw/sync";

// Images stockées directement dans la planche (data URL). Simple pour commencer.
const assets: TLAssetStore = {
  upload: (_asset, file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ src: reader.result as string });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }),
  resolve: (asset) => asset.props.src,
};

// Empêche un bug d'affichage de vider toute la page : on affiche un message à la place.
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("Planche en direct :", error); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui" }}>
          <p>Un problème d'affichage est survenu.</p>
          <button onClick={() => window.location.reload()}>Recharger la planche</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Status({ text }: { text: string }) {
  return <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "#222", color: "#eee", padding: "6px 12px", borderRadius: 8, fontFamily: "system-ui", fontSize: 13 }}>{text}</div>;
}

export function LivePlanche({ id }: { id: string }) {
  const sync = useSync({
    uri: `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/connect/${id}`,
    assets,
  });
  // On garde le dernier store connu : l'éditeur n'est jamais démonté pendant une reconnexion.
  const lastStore = useRef<TLStore | null>(null);
  const editorRef = useRef<Editor | null>(null);
  if (sync.store) lastStore.current = sync.store;

  if (!lastStore.current) {
    return <p style={{ padding: 24, fontFamily: "system-ui" }}>{sync.status === "error" ? "Connexion impossible. Réessaie dans un instant." : "Connexion à la planche…"}</p>;
  }

  const offline = sync.status === "synced-remote" && sync.connectionStatus === "offline";
  return (
    <Boundary>
      <div style={{ position: "fixed", inset: 0 }}>
        <Tldraw store={lastStore.current} onMount={(editor) => { editorRef.current = editor; }} />
        {offline ? <Status text="Connexion perdue, reconnexion en cours…" /> : null}
        {sync.status === "error" ? <Status text="Erreur de synchro, recharge la page." /> : null}
      </div>
    </Boundary>
  );
}
