import { getUserAuth } from "../helpers/moodle.js";

// Middleware que verifica que el usuario este autenticado
export function requireAuth(req, res, next) {
  if (!getUserAuth(req)) {
    return res.status(401).json({ error: "Falta el token de sesión" });
  }
  next();
}
