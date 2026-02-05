# MoodleApp Backend (Proxy API)

Backend **Node.js + Express (ESM)** que expone una API para una app móvil y actúa como **proxy** hacia **Moodle Web Services**. Incluye autenticación (Moodle) y flujo **Google OAuth** opcional.

## Requisitos
- Node.js 18 o superior
- Moodle accesible en red (LAN/dominio) con **Web Services** habilitados y un **Servicio externo** configurado

## Setup
```bash
git clone https://github.com/Gabo-UG/MoodleApp-Backend.git
cd MoodleApp-Backend
npm i
cp .env.example .env
```
## Variables (.env)
```bash
PORT=3000
MOODLE_BASE=http://TU_IP_AQUI/moodle
MOODLE_SERVICE=moodle_mobile_app
```
### Opcional: Google OAuth
```bash
GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET
```
### Opcional: para crear/vincular usuario en Moodle desde Google
```bash
MOODLE_ADMIN_TOKEN=TU_ADMIN_TOKEN
```
# Run
#### Dev
```bash
npm run dev
```
#### Prod
```bash
npm start
```
#### Base URL: http://localhost:3000
- Móvil (Expo/Android/iOS): usa la IP LAN de tu PC (ej. http://192.168.1.50:3000) en lugar de localhost.
# Google OAuth
En Google Cloud Console (OAuth Client tipo Web Application) agrega Redirect URIs:
- http://localhost:3000/auth/google/callback
- http://localhost:8081
## Auth
### Cursos
```bash
GET /courses
GET /course/:courseId/contents
GET /course/:courseId/grades
GET /course/:courseId/assignments
GET /course/:courseId/forums
```
### Tareas
```bash
GET /assign/:assignId/status
POST /assign/:assignId/save-text
POST /assign/:assignId/save-file (multipart/form-data, campo file)
POST /assign/:assignId/submi
```
### Foros
```bash
GET /forum/:forumId/discussions
GET /discussion/:discussionId/posts
POST /forum/reply
```
### Archivos
```bash
GET /file (descarga via filesController.downloadFile)
```






