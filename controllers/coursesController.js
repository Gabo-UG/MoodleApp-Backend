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
