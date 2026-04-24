import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiHost = env.VITE_API_HOST || "localhost";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: "0.0.0.0",       // expõe na rede em todos os modos
      proxy: {
        "/api": `http://${apiHost}:3333`,
        "/socket.io": { target: `http://${apiHost}:3333`, ws: true },
      },
    },
  };
});
