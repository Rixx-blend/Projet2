import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "tldraw/tldraw.css";
import { LivePlanche } from "./LivePlanche";

// /b/<id> : l'id de la planche sert de salle de synchro.
const match = window.location.pathname.match(/^\/b\/([0-9a-f-]{36})\/?$/i);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {match ? <LivePlanche id={match[1]} /> : <p style={{ padding: 24, fontFamily: "system-ui" }}>Lien de planche invalide.</p>}
  </StrictMode>,
);
