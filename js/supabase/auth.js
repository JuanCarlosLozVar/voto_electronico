// =====================================================================
// SESIÓN Y AUTORIZACIÓN (roles: admin / directivo)
// =====================================================================
// Funciones para saber quién ha iniciado sesión y a qué páginas puede
// entrar. Se apoyan en la tabla "perfiles" (columna "rol": admin |
// directivo) y en supabaseClient.auth para la sesión.
//
// Depende de: js/supabase/client.js (supabaseClient).
//
// Usado por:
//   - obtenerPerfilActual()   → index/login.js, invitacion/*, y como
//                                base de las dos funciones "require*".
//   - requireAdminSession()   → entry.js de configuracion, usuarios,
//                                dashboard, jornada, listas, mesas,
//                                padron (páginas SOLO para admin).
//   - requireResultsSession() → resultados/entry.js (admin o directivo).
//   - cerrarSesion()          → botón "Cerrar sesión" en el HTML de
//                                cada página administrativa (por eso se
//                                expone en window, ver abajo).
// =====================================================================

import { supabaseClient } from "./client.js";

// Trae el perfil (rol, subrol, activo, etc.) del usuario que tiene la
// sesión abierta en este navegador. Devuelve null si no hay sesión, si
// el perfil no existe todavía, o si el perfil está desactivado.
export async function obtenerPerfilActual() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user) return null;

  const { data, error } = await supabaseClient
    .from("perfiles")
    .select("id,email,rol,subrol,activo")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !data || !data.activo) return null;
  return data;
}

// Solo el administrador puede entrar a las páginas de gestión. Un
// directivo autenticado se envía a la pantalla de resultados en vivo.
export async function requireAdminSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }

  const perfil = await obtenerPerfilActual();
  if (!perfil || perfil.rol !== "admin") {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html?acceso=denegado";
    return null;
  }
  return perfil;
}

// Admin y directivo pueden consultar resultados. Todo lo demás sigue
// protegido por requireAdminSession().
export async function requireResultsSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }

  const perfil = await obtenerPerfilActual();
  if (!perfil || !["admin", "directivo"].includes(perfil.rol)) {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html?acceso=denegado";
    return null;
  }
  return perfil;
}

export async function cerrarSesion() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

// El botón "Cerrar sesión" del HTML usa onclick="cerrarSesion()" en
// vez de addEventListener, así que la función tiene que existir como
// global (window.cerrarSesion), no solo como export del módulo. Esta
// línea es la única "conexión" necesaria para que ese botón siga
// funcionando igual que antes de modularizar.
window.cerrarSesion = cerrarSesion;
