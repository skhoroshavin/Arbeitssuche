import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IpcCacheProvider } from "./hooks";
import { BrowserRouter } from "react-router";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IpcCacheProvider staleTime={30_000}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </IpcCacheProvider>
  </StrictMode>,
);
