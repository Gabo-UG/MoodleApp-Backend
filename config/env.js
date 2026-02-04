import dotenv from "dotenv";

dotenv.config();

export const MOODLE_BASE = process.env.MOODLE_BASE;
export const MOODLE_SERVICE = process.env.MOODLE_SERVICE || "app_movil";
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
export const PORT = process.env.PORT || 3000;
