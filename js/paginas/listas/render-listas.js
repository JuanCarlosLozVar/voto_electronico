// =====================================================================
// RENDER DE LISTAS Y CANDIDATOS — listas.html
// =====================================================================
// Trae las listas (con sus candidatos) de la elección actual y pinta
// las tarjetas de #contenedorListas.
//
// Depende de: supabaseClient, escapeHtml, estado.js.
//
// Usado por: entry.js (carga inicial) y por listas-crud.js /
// candidatos-crud.js (para refrescar después de crear/editar/borrar).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import { eleccionActualId, listasCache, setListasCache } from "./estado.js";

export async function cargarListas() {
  const cont = document.getElementById("contenedorListas");

  if (!eleccionActualId) {
    setListasCache([]);
    cont.innerHTML = `<div class="col-12 text-center text-muted py-4">Configura primero la jornada electoral.</div>`;
    return;
  }

  const { data: listas, error } = await supabaseClient
    .from("listas")
    .select("*, candidatos(*)")
    .eq("eleccion_id", eleccionActualId)
    .order("numero");

  if (error) {
    cont.innerHTML = `<div class="col-12 text-danger text-center py-4">${escapeHtml(error.message)}</div>`;
    return;
  }
  setListasCache(listas || []);

  if (!listasCache.length) {
    cont.innerHTML = `<div class="col-12 text-center text-muted py-4">Aún no hay listas registradas para esta elección.</div>`;
    return;
  }

  cont.innerHTML = listasCache
    .map(
      (l) => `
    <div class="col-md-6">
      <div class="card p-3 h-100">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div class="d-flex align-items-center gap-2">
            ${
              l.logo_url
                ? `<img src="${l.logo_url}" alt="" style="width:44px;height:44px;object-fit:contain;border:1px solid var(--borde);border-radius:.4rem;padding:2px;">`
                : `<div class="avatar-candidato" style="width:44px;height:44px;">${l.numero}</div>`
            }
            <div>
              <span class="badge badge-pendiente">Lista ${l.numero}</span>
              <h3 class="h5 mt-1 mb-0">${escapeHtml(l.nombre)}</h3>
            </div>
          </div>
          <span class="badge ${l.activa ? "badge-abierta" : "badge-cerrada"}">${l.activa ? "Activa" : "Inactiva"}</span>
        </div>

        <ul class="list-group list-group-flush mb-2">
          ${
            (l.candidatos || [])
              .map(
                (c) => `
            <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
              <span class="d-flex align-items-center gap-2">
                ${
                  c.foto_url
                    ? `<img src="${c.foto_url}" alt="" style="width:32px;height:32px;object-fit:cover;border-radius:50%;">`
                    : `<span class="avatar-candidato" style="width:32px;height:32px;font-size:.7rem;">${escapeHtml((c.nombres || "?").charAt(0))}${escapeHtml((c.apellidos || "").charAt(0))}</span>`
                }
                ${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos)} <span class="text-muted small">— ${escapeHtml(c.cargo)}</span>
              </span>
              <button class="btn btn-sm btn-outline-danger" onclick="eliminarCandidato(${c.id})">✕</button>
            </li>
          `,
              )
              .join("") ||
            '<li class="list-group-item px-0 text-muted small">Sin candidatos aún</li>'
          }
        </ul>

        <div class="d-flex gap-2 mt-auto flex-wrap">
          <button class="btn btn-sm btn-azul" onclick="abrirModalCandidato(${l.id})">+ Candidato</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="editarLista(${l.id})">Editar lista</button>
          <button class="btn btn-sm btn-outline-danger" onclick="eliminarLista(${l.id})">Eliminar lista</button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}
