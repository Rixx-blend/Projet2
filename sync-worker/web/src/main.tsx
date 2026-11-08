import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "tldraw/tldraw.css";
import { LivePlanche } from "./LivePlanche";

// Protection au plus haut niveau : une erreur affiche son message au lieu d'une page blanche.
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("Planche en direct :", error); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui", color: "#b00" }}>
          <p><strong>Erreur :</strong> {this.state.error.message}</p>
          <button onClick={() => window.location.reload()}>Recharger</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const match = window.location.pathname.match(/^\/b\/([0-9a-f-]{36})\/?$/i);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Boundary>
      {match ? <LivePlanche id={match[1]} /> : <p style={{ padding: 24, fontFamily: "system-ui" }}>Lien de planche invalide.</p>}
    </Boundary>
  </StrictMode>,
);
