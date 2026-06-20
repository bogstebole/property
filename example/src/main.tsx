import React from "react";
import ReactDOM from "react-dom/client";
import { InspectorRoot } from "visual-qa-inspector/react";
import App from "./App";
import "./tokens.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    {import.meta.env.DEV && <InspectorRoot />}
  </React.StrictMode>
);
