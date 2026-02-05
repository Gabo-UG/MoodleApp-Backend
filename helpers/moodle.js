import axios from "axios";
import { MOODLE_BASE, ADMIN_TOKEN } from "../config/env.js";

// Extrae el token de autenticacion del header Authorization
export function getUserAuth(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  if (auth.length > 0) return auth.trim();
  return null;
}

// Realiza una llamada a la API de Moodle usando el token del usuario
export async function moodleCall(req, wsfunction, params = {}) {
  const token = getUserAuth(req);
  if (!token) throw new Error("Token no proporcionado");

  const url = `${MOODLE_BASE}/webservice/rest/server.php`;
  const body = new URLSearchParams({
    wstoken: token,
    wsfunction,
    moodlewsrestformat: "json",
    ...params,
  });

  const { data } = await axios.post(url, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (data?.exception) throw new Error(data.message);
  return data;
}

// Verifica si un email esta registrado en Moodle
export async function isEmailInMoodle(email) {
  try {
    if (!ADMIN_TOKEN) {
      console.log("ADMIN_TOKEN no configurado, saltando validación de email");
      return true;
    }

    const url = `${MOODLE_BASE}/webservice/rest/server.php`;
    const params = new URLSearchParams({
      wstoken: ADMIN_TOKEN,
      wsfunction: "core_user_get_users_by_field",
      moodlewsrestformat: "json",
      field: "email",
      "values[0]": email,
    });

    const { data } = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (data?.exception || data?.errorcode) {
      console.log("Error buscando usuario:", data.message || data.errorcode);
      return true;
    }

    return data && data.length > 0;
  } catch (error) {
    console.log("Error verificando email:", error.message);
    return true;
  }
}
