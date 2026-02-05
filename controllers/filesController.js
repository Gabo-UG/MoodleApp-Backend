import axios from "axios";
import { getUserAuth } from "../helpers/moodle.js";

// Descarga un archivo de Moodle usando el token del usuario
export async function downloadFile(req, res) {
  try {
    const u = req.query.u;
    if (!u) {
      return res.status(400).json({ error: "Falta URL" });
    }

    const token = getUserAuth(req);
    const urlObj = new URL(decodeURIComponent(u));
    urlObj.searchParams.set("token", token);

    const response = await axios.get(urlObj.toString(), {
      responseType: "stream",
      timeout: 20000,
    });

    if (response.headers["content-type"]) {
      res.setHeader("Content-Type", response.headers["content-type"]);
    }
    response.data.pipe(res);
  } catch (e) {
    res.status(500).json({ ok: false, error: "Error descargando archivo" });
  }
}
