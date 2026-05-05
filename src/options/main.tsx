import React from "react";
import { createRoot } from "react-dom/client";
import { OptionsApp } from "./OptionsApp";
import "../sidepanel/styles.css";
import "./options.css";

const container = document.getElementById("root");
if (!container) throw new Error("#root introuvable");
createRoot(container).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>,
);
