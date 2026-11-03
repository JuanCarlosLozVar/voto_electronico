// =====================================================================
// TABLA DE DIRECTIVOS — usuarios.html
// =====================================================================
// Lista los directivos/subdirectores registrados y permite
// activar/desactivar su acceso a la pantalla de resultados.
//
// Depende de: supabaseClient, escapeHtml.
//
// Usado por: entry.js (carga inicial) y a sí mismo (cambiarEstadoDirectivo
// vuelve a llamar cargarDirectivos tras guardar).
//
// cambiarEstadoDirectivo se expone en window porque la tabla la llama
// con onclick="cambiarEstadoDirectivo(...)" (HTML generado dinámicamente
// en el propio map() de abajo).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";

export async function cargarDirectivos() {
  const { data, error } = await supabaseClient
    .from("perfiles")
    .select("id,email,rol,subrol,activo,created_at")
    .eq("rol", "directivo")
    .order("created_at", { ascending: false });
  const tbody = document.querySelector("#tablaDirectivos tbody");
  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-danger">${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted">Todavía no hay directivos.</td></tr>`;
    return;
  }
  tbody.innerHTML = data
    .map(
      (u) => `
    <tr>
      <td>${escapeHtml(u.email)}</td>
      <td>${u.subrol === "subdirector" ? "Subdirector" : "Director"}</td>
      <td><span class="badge ${u.activo ? "badge-abierta" : "badge-cerrada"}">${u.activo ? "Activo" : "Inactivo"}</span></td>
      <td><button class="btn btn-sm btn-outline-${u.activo ? "danger" : "success"}" onclick="cambiarEstadoDirectivo('${u.id}', ${!u.activo})">${u.activo ? "Desactivar" : "Activar"}</button></td>
    </tr>
  `,
    )
    .join("");
}

export async function cambiarEstadoDirectivo(id, activo) {
  const confirm = await Swal.fire({
    title: activo ? "¿Activar directivo?" : "¿Desactivar directivo?",
    text: activo
      ? "Podrá volver a consultar resultados."
      : "Ya no podrá entrar al panel de resultados.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: activo ? "Activar" : "Desactivar",
    cancelButtonText: "Cancelar",
  });
  if (!confirm.isConfirmed) return;
  const { error } = await supabaseClient
    .from("perfiles")
    .update({ activo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("rol", "directivo");
  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }
  cargarDirectivos();
}
window.cambiarEstadoDirectivo = cambiarEstadoDirectivo;
