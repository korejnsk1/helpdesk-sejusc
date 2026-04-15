import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) return res.status(401).json({ error: "Token ausente" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  };
}
