import { Tldraw, type TLAssetStore } from "tldraw";
import { useSync } from "@tldraw/sync";

// Images stockées directement dans la planche (data URL). Simple pour commencer ;
// un stockage de fichiers dédié pourra remplacer cette partie plus tard.
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

export function LivePlanche({ id }: { id: string }) {
  const store = useSync({
    uri: `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/connect/${id}`,
    assets,
  });

  if (store.status === "loading") return <p style={{ padding: 24, fontFamily: "system-ui" }}>Connexion à la planche…</p>;
  if (store.status === "error") return <p style={{ padding: 24, fontFamily: "system-ui" }}>Connexion impossible. Réessaie dans un instant.</p>;

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Tldraw store={store.store} />
    </div>
  );
}
