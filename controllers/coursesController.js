import { moodleCall } from "../helpers/moodle.js";

// Obtiene los cursos activos del usuario
export async function getCourses(req, res) {
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
}

// Obtiene el contenido de un curso especifico
export async function getCourseContents(req, res) {
  try {
    const contents = await moodleCall(req, "core_course_get_contents", {
      courseid: req.params.courseId,
    });
    res.json({ ok: true, contents });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

// Obtiene las calificaciones de un curso
export async function getCourseGrades(req, res) {
  try {
    const data = await moodleCall(req, "gradereport_user_get_grade_items", {
      courseid: req.params.courseId,
    });
    res.json({ ok: true, grades: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

//obtener participantes
export async function getParticipants(req, res) {
  try {
    const courseId = req.params.courseId;
    const data = await moodleCall(req, "core_enrol_get_enrolled_users", {
      courseid: courseId,
    });

    // Mapear los datos necesarios
    const participants = data.map((user) => ({
      id: user.id,
      fullname: user.fullname || "Sin nombre",
      email: user.email || "Sin correo",
      profileimageurl: user.profileimageurl || null,
      roles: user.roles
        ? user.roles.map((role) => role.shortname).join(", ")
        : "Sin rol",
      groups: user.groups
        ? user.groups.map((group) => group.name).join(", ")
        : "Sin grupo",
    }));

    console.log(`Participantes del curso ${courseId}:`, participants.length);
    res.json({ ok: true, participants });
  } catch (error) {
    console.error("Error obteniendo participantes:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
}

//para obtener las secciones de un curso
const getCourseModules = async (req, res) => {
  const courseId = req.params.courseId;
  const token = req.user.token;

  const response = await fetch(
    `${MOODLE_URL}?wstoken=${token}&wsfunction=core_course_get_contents&moodlewsrestformat=json&courseid=${courseId}`,
  );
  const data = await response.json();

  // Extraer módulos y sus secciones
  const modules = data.map((section) => ({
    section: section.id, // ID de la sección o topic
    sectionName: section.name, // Nombre de la sección
    modules: section.modules.map((module) => ({
      id: module.id,
      name: module.name,
      modname: module.modname,
      instance: module.instance,
      section: section.id, // Asociar el módulo con su sección
    })),
  }));

  res.json(modules);
  
};
