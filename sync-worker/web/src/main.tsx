import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "tldraw/tldraw.css";
import { LivePlanche } from "./LivePlanche";

// Protection au plus haut niveau : une erreur n'efface plus toute la page,
// elle affiche le message exact pour qu'on puisse le corriger.
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("Planche en direct :", error); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui", color: "#b00" }}>
          <p><strong>Erreur :</strong> {this.state.error.message}</p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{this.state.error.stack}</pre>
          <button onClick={() => window.location.reload()}>Recharger</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// /b/<id> : l'id de la planche sert de salle de synchro.
const match = window.location.pathname.match(/^\/b\/([0-9a-f-]{36})\/?$/i);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Boundary>
      {match ? <LivePlanche id={match[1]} /> : <p style={{ padding: 24, fontFamily: "system-ui" }}>Lien de planche invalide.</p>}
    </Boundary>
  </StrictMode>,
);
