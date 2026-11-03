// =====================================================================
// UTILIDAD DE SEGURIDAD: escapeHtml
// =====================================================================
// Función pura (no depende de Supabase ni del DOM) que convierte texto
// dinámico en texto seguro para insertar dentro de innerHTML/template
// strings. Evita que un dato guardado en la base (por ejemplo un
// nombre importado por CSV/Excel) pueda ejecutarse como HTML/JS en el
// navegador de otro usuario (ataque XSS almacenado).
//
// REGLA DE USO: usar SIEMPRE que se inserte un dato que viene de la
// base de datos (nombres, apellidos, mensajes de error, etc.) dentro
// de un `innerHTML = \`...\`` o similar.
//
// Usado por: casi todos los módulos de js/paginas/**/*.js que arman
// tablas o tarjetas con datos de Supabase.
// =====================================================================

export function escapeHtml(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
