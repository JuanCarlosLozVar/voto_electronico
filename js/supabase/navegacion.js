// =====================================================================
// NAVEGACIÓN SEGÚN ROL
// =====================================================================
// Ajusta el menú de páginas administrativas para directivos: oculta
// los enlaces marcados data-solo-admin="true" y cambia la etiqueta de
// rol (Director / Subdirector / Administrador) donde exista
// data-rol-directivo-label.
//
// Depende de: js/supabase/auth.js (obtenerPerfilActual).
//
// Usado por: dashboard/entry.js (se llama igual que antes, de forma
// independiente al resto de la carga del dashboard) y
// resultados/entry.js.
// =====================================================================

import { obtenerPerfilActual } from "./auth.js";

export async function ajustarNavegacionPorRol() {
  const perfil = await obtenerPerfilActual();
  if (!perfil) return null;

  document.querySelectorAll('[data-solo-admin="true"]').forEach(el => {
    el.classList.toggle("d-none", perfil.rol !== "admin");
  });
  document.querySelectorAll('[data-rol-directivo-label]').forEach(el => {
    el.textContent = perfil.rol === "directivo"
      ? (perfil.subrol === "subdirector" ? "Subdirector" : "Director")
      : "Administrador";
  });
  return perfil;
}
