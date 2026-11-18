import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../experience/fonts";
import "../styles/theme.css";
import "../styles/components.css";
import "../styles/pages.css";
import { PanelApp } from "./PanelApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PanelApp />
  </StrictMode>,
);
