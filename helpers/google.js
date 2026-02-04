import fs from "fs";
import path from "path";

const LINKS_FILE = path.join(process.cwd(), "google-links.json");

// Obtiene las cuentas vinculadas Google-Moodle
export function getLinks() {
  try {
    return JSON.parse(fs.readFileSync(LINKS_FILE, "utf8"));
  } catch {
    return {};
  }
}

// Guarda las cuentas vinculadas Google-Moodle
export function saveLinks(links) {
  fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2));
}
