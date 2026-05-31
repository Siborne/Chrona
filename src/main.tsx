import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { applyTimeTheme } from "./theme";

// Apply time-aware accent colors before first render to avoid flash
applyTimeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
