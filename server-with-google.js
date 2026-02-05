import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import FormData from "form-data";
import { OAuth2Client } from "google-auth-library";
import multer from "multer";

dotenv.config();

const app = express();
const upload = multer(); // Para manejar subida de archivos

// ===== GOOGLE OAUTH =====
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 3000;
const MOODLE_BASE = process.env.MOODLE_BASE;
const MOODLE_SERVICE = process.env.MOODLE_SERVICE || "app_movil";

// ===== Helpers =====

// Extrae el token limpio del header Authorization
function getUserAuth(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  if (auth.length > 0) return auth.trim();
  return null;
}

// Llamada estándar a Moodle (siempre usa el token del usuario logueado)
async function moodleCall(req, wsfunction, params = {}) {
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

// ===== RUTAS =====

app.get("/health", (req, res) => res.json({ ok: true, mode: "with-google" }));

// 1. LOGIN NORMAL (Devuelve Token Real)
app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Obtener Token
    const tokenUrl = `${MOODLE_BASE}/login/token.php`;
    const { data: tokenData } = await axios.get(tokenUrl, {
      params: { username, password, service: MOODLE_SERVICE },
    });

    if (tokenData?.error)
      return res.status(401).json({ ok: false, error: tokenData.error });

    // Obtener Info Usuario
    const infoBody = new URLSearchParams({
      wstoken: tokenData.token,
      wsfunction: "core_webservice_get_site_info",
      moodlewsrestformat: "json",
    });
    const { data: info } = await axios.post(
      `${MOODLE_BASE}/webservice/rest/server.php`,
      infoBody.toString(),
    );

    res.json({
      ok: true,
      token: tokenData.token,
      user: {
        id: info.userid,
        fullname: info.fullname,
        email: username,
        avatar: info.userpictureurl,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 2. LOGIN CON GOOGLE (Nuevo)
app.post("/auth/google", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res
        .status(400)
        .json({ ok: false, error: "Token de Google no proporcionado" });
    }

    // Verificar el token de Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    console.log("✅ Usuario autenticado con Google:", email);

    // Sin token de admin, devolvemos info básica para que vincule manualmente
    res.json({
      ok: true,
      requiresLinking: true,
      googleUser: {
        email,
        name,
        picture,
      },
      message:
        "Autenticación con Google exitosa. Ahora ingresa tu usuario y contraseña de Moodle.",
    });
  } catch (e) {
    console.error("Error en login con Google:", e);
    res
      .status(500)
      .json({ ok: false, error: "Error verificando token de Google" });
  }
});

// 3. VINCULAR CUENTA GOOGLE CON MOODLE (Nuevo)
app.post("/auth/link-google-moodle", async (req, res) => {
  try {
    const { idToken, username, password } = req.body;

    // Verificar Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleEmail = payload.email;
    const googleName = payload.name;
    const googlePicture = payload.picture;

    // Login en Moodle
    const tokenUrl = `${MOODLE_BASE}/login/token.php`;
    const { data: tokenData } = await axios.get(tokenUrl, {
      params: { username, password, service: MOODLE_SERVICE },
    });

    if (tokenData?.error) {
      return res
        .status(401)
        .json({ ok: false, error: "Credenciales de Moodle incorrectas" });
    }

    // Obtener Info Usuario
    const infoBody = new URLSearchParams({
      wstoken: tokenData.token,
      wsfunction: "core_webservice_get_site_info",
      moodlewsrestformat: "json",
    });
    const { data: info } = await axios.post(
      `${MOODLE_BASE}/webservice/rest/server.php`,
      infoBody.toString(),
    );

    res.json({
      ok: true,
      token: tokenData.token,
      user: {
        id: info.userid,
        fullname: info.fullname,
        email: info.useremail || username,
        avatar: info.userpictureurl || googlePicture,
        googleEmail,
        linkedToGoogle: true,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === MIDDLEWARE DE SEGURIDAD ===
// A partir de aquí, todas las rutas exigen token
app.use((req, res, next) => {
  if (!getUserAuth(req))
    return res.status(401).json({ error: "Falta el token de sesión" });
  next();
});

// 4. CURSOS
app.get("/courses", async (req, res) => {
  try {
    const data = await moodleCall(
      req,
      "core_course_get_enrolled_courses_by_timeline_classification",
      {
        classification: "inprogress",
      },
    );
    res.json({ ok: true, courses: data.courses || [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 5. CONTENIDOS
app.get("/course/:courseId/contents", async (req, res) => {
  try {
    const contents = await moodleCall(req, "core_course_get_contents", {
      courseid: req.params.courseId,
    });
    res.json({ ok: true, contents });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 6. TAREAS (ASSIGNMENTS)

app.get("/assign/:assignId/status", async (req, res) => {
  try {
    const data = await moodleCall(req, "mod_assign_get_submission_status", {
      assignid: req.params.assignId,
    });
    res.json({ ok: true, status: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/assign/:assignId/save-text", async (req, res) => {
  try {
    const { text } = req.body;
    const result = await moodleCall(req, "mod_assign_save_submission", {
      assignmentid: req.params.assignId,
      "plugindata[onlinetext_editor][text]": text,
      "plugindata[onlinetext_editor][format]": 1,
      "plugindata[onlinetext_editor][itemid]": 0,
    });
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/assign/:assignId/submit", async (req, res) => {
  try {
    const result = await moodleCall(req, "mod_assign_submit_for_grading", {
      assignmentid: req.params.assignId,
      acceptsubmissionstatement: 1,
    });
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post(
  "/assign/:assignId/save-file",
  upload.single("file"),
  async (req, res) => {
    try {
      const token = getUserAuth(req);
      if (!token) return res.status(401).json({ error: "Falta token" });
      if (!req.file)
        return res.status(400).json({ error: "No se recibió archivo" });

      const uploadUrl = `${MOODLE_BASE}/webservice/upload.php`;

      const form = new FormData();
      form.append("token", token);
      form.append("file", req.file.buffer, req.file.originalname);

      const uploadRes = await axios.post(uploadUrl, form, {
        headers: form.getHeaders(),
      });

      const uploadedFiles = uploadRes.data;

      if (uploadedFiles.error) throw new Error(uploadedFiles.error);
      if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
        if (uploadedFiles.exception) throw new Error(uploadedFiles.message);
        throw new Error("Error desconocido al subir archivo al Draft Area");
      }

      const draftItemId = uploadedFiles[0].itemid;
      console.log(`📂 Archivo subido a Draft Area. ItemID: ${draftItemId}`);

      const result = await moodleCall(req, "mod_assign_save_submission", {
        assignmentid: req.params.assignId,
        "plugindata[files_filemanager]": draftItemId,
      });

      res.json({ ok: true, result });
    } catch (e) {
      console.error("❌ Error Upload:", e.response?.data || e.message);
      res.status(500).json({ ok: false, error: e.message });
    }
  },
);

// 7. FOROS

app.get("/forum/:forumId/discussions", async (req, res) => {
  try {
    const data = await moodleCall(req, "mod_forum_get_forum_discussions", {
      forumid: req.params.forumId,
    });
    res.json({ ok: true, discussions: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/discussion/:discussionId/posts", async (req, res) => {
  try {
    const data = await moodleCall(req, "mod_forum_get_discussion_posts", {
      discussionid: req.params.discussionId,
    });
    res.json({ ok: true, posts: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/forum/reply", async (req, res) => {
  try {
    const { postid, subject, message } = req.body;

    const result = await moodleCall(req, "mod_forum_add_discussion_post", {
      postid: postid,
      subject: subject,
      message: message,
      "options[0][name]": "discussionsubscribe",
      "options[0][value]": true,
    });

    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 8. NOTAS
app.get("/course/:courseId/grades", async (req, res) => {
  try {
    const data = await moodleCall(req, "gradereport_user_get_grade_items", {
      courseid: req.params.courseId,
    });
    res.json({ ok: true, grades: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 9. DESCARGA DE ARCHIVOS (Proxy Seguro)
app.get("/file", async (req, res) => {
  try {
    const u = req.query.u;
    if (!u) return res.status(400).json({ error: "Falta URL" });

    const token = getUserAuth(req);
    const urlObj = new URL(decodeURIComponent(u));
    urlObj.searchParams.set("token", token);

    const response = await axios.get(urlObj.toString(), {
      responseType: "stream",
      timeout: 20000,
    });

    if (response.headers["content-type"])
      res.setHeader("Content-Type", response.headers["content-type"]);
    response.data.pipe(res);
  } catch (e) {
    res.status(500).json({ ok: false, error: "Error descargando archivo" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend con Google OAuth corriendo en puerto ${PORT}`);
});
