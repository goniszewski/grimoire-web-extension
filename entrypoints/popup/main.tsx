import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { detectPlatform } from "../../src/lib/platform";
import "./style.css";

void detectPlatform().then((platform) => {
  // Lets the stylesheet switch to the full-screen Android popup layout.
  document.documentElement.dataset.platform = platform;
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App platform={platform} />
    </React.StrictMode>,
  );
});
