// =====================================================================
// INFORMACIÓN PÚBLICA DEL COLEGIO (nombre, lema, insignia)
// =====================================================================
// Pinta el nombre/lema/insignia del colegio en cualquier página que
// tenga los elementos #colegioNombre, #colegioLema, #colegioInsignia y
// #colegioSello. Es información pública (no requiere sesión), por eso
// vive junto al resto de utilidades de Supabase y no en auth.js.
//
// Depende de: js/supabase/client.js (supabaseClient).
//
// Usado por: index/entry.js y votar/entry.js (páginas públicas, sin
// login, que muestran la identidad del colegio).
// =====================================================================

import { supabaseClient } from "./client.js";

export async function cargarColegioPublico() {
  try {
    const { data, error } = await supabaseClient
      .from("colegio")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return null;

    const elNombre = document.getElementById("colegioNombre");
    const elLema = document.getElementById("colegioLema");
    const elInsignia = document.getElementById("colegioInsignia");
    const elSello = document.getElementById("colegioSello");

    if (elNombre && data.nombre) elNombre.textContent = data.nombre;
    if (elLema) elLema.textContent = [data.ie_codigo, data.lema].filter(Boolean).join(" · ");

    if (data.insignia_url) {
      if (elInsignia) {
        elInsignia.src = data.insignia_url;
        elInsignia.classList.remove("d-none");
      }
      if (elSello) elSello.classList.add("d-none");
    }

    return data;
  } catch (e) {
    console.error("No se pudo cargar el colegio:", e);
    return null;
  }
}
