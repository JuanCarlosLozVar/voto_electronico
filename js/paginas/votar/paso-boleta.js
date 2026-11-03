// =====================================================================
// PASO 2 → 3: Boleta (elegir lista o voto en blanco) — votar.html
// =====================================================================
// Carga las listas activas y pinta la boleta como tarjetas
// seleccionables (incluida la opción "Voto en blanco").
//
// seleccionarLista se expone en window porque las tarjetas generadas
// aquí mismo la llaman con onclick="seleccionarLista(...)".
//
// Depende de: supabaseClient, escapeHtml, plantillas.js
// (badgeAlumnoHtml, avatarHtml, candidatoPrincipal, mostrarPaso),
// estado.js.
// Usado por: entry.js (solo se importa).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import { mostrarPaso, badgeAlumnoHtml, avatarHtml, candidatoPrincipal } from "./plantillas.js";
import { estudianteActual, setListasCache, setListaSeleccionada } from "./estado.js";

document
  .getElementById("btnContinuarVotar")
  .addEventListener("click", async () => {
    const { data: listas, error } = await supabaseClient
      .from("listas")
      .select("*, candidatos(*)")
      .eq("activa", true)
      .order("numero");

    const cont = document.getElementById("listaOpciones");
    document.getElementById("badgeAlumnoBoleta").innerHTML =
      badgeAlumnoHtml(estudianteActual);

    const tarjetaBlanco = `
    <div class="col-md-4">
      <div class="lista-card lista-blanco" data-lista-id="blanco" onclick="seleccionarLista('blanco')">
        <span class="lista-numero-tag">Opción especial</span>
        <h3 class="h6 mb-1">Voto en blanco</h3>
        <p class="small text-muted mb-0">No elijo ninguna lista, pero mi participación queda registrada.</p>
      </div>
    </div>
  `;

    if (error || !listas || !listas.length) {
      setListasCache([]);
      cont.innerHTML =
        `<div class="col-12"><div class="alert alert-warning mb-3">No hay listas activas disponibles en este momento.</div></div>` +
        tarjetaBlanco;
      mostrarPaso("pasoBoleta");
      return;
    }

    setListasCache(listas);

    cont.innerHTML =
      listas
        .map((l) => {
          const principal = candidatoPrincipal(l.candidatos);
          const otros = (l.candidatos || []).length - (principal ? 1 : 0);
          const logo = l.logo_url
            ? `<img src="${l.logo_url}" alt="Símbolo de ${escapeHtml(l.nombre)}" class="lista-logo">`
            : `<div class="lista-logo d-flex align-items-center justify-content-center small text-muted">Lista ${l.numero}</div>`;
          return `
      <div class="col-md-4">
        <div class="lista-card" data-lista-id="${l.id}" onclick="seleccionarLista(${l.id})">
          <div class="d-flex align-items-center gap-2 mb-2">
            ${logo}
            <span class="lista-numero-tag mb-0">Lista ${l.numero}</span>
          </div>
          <h3 class="h6 mb-2">${escapeHtml(l.nombre)}</h3>
          <div class="d-flex align-items-center gap-2">
            ${avatarHtml(principal)}
            <div>
              <div class="small text-muted">${principal ? escapeHtml(principal.cargo) : "Sin candidatos"}</div>
              <strong class="small">${principal ? escapeHtml(principal.nombres + " " + principal.apellidos) : "–"}</strong>
            </div>
          </div>
          ${otros > 0 ? `<div class="small text-muted mt-2">+ ${otros} candidato(s) más</div>` : ""}
        </div>
      </div>
    `;
        })
        .join("") + tarjetaBlanco;

    mostrarPaso("pasoBoleta");
  });

export function seleccionarLista(id) {
  setListaSeleccionada(id);
  document.querySelectorAll(".lista-card").forEach((el) => {
    const esEste =
      id === "blanco"
        ? el.dataset.listaId === "blanco"
        : Number(el.dataset.listaId) === id;
    el.classList.toggle("seleccionada", esEste);
  });
  document.getElementById("btnIrAConfirmar").disabled = false;
}
window.seleccionarLista = seleccionarLista;
