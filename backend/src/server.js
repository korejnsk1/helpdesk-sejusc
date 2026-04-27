import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server as SocketServer } from "socket.io";
import routes from "./routes/index.js";

const allowedOrigin = process.env.CORS_ORIGIN;
if (!allowedOrigin) {
  console.warn("AVISO: CORS_ORIGIN não definido — aceitando qualquer origem (somente dev)");
}

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: allowedOrigin || "*", methods: ["GET", "POST"] },
});
app.set("io", io);

app.use(cors({
  origin: allowedOrigin || "*",
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_, res) => res.json({ ok: true, service: "helpdesk-sejusc" }));
app.use("/api", routes);

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

const PORT = Number(process.env.PORT || 3333);
server.listen(PORT, () => {
  console.log(`HelpDesk API rodando em http://localhost:${PORT}`);
});
