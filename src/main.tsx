import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import "./styles.css";
import { getRouter } from "./router";

// Web の画面の入口（ブラウザだけで描く SPA。HTML は index.html で、Cloudflare の静的ファイルとして配る）。
const container = document.getElementById("app");

if (!container) {
	throw new Error("index.html に #app がありません");
}

createRoot(container).render(<RouterProvider router={getRouter()} />);
