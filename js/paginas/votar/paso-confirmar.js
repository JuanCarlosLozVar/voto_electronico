// =====================================================================
// PASO 3 → 4: Pantalla de confirmación — votar.html
// =====================================================================
// Arma el resumen de la lista elegida (o del voto en blanco) antes de
// confirmar definitivamente. "Cambiar mi voto" regresa a la boleta.
//
// Depende de: plantillas.js (mostrarPaso, badgeAlumnoHtml, avatarHtml,
// candidatoPrincipal), estado.js.
// Usado por: entry.js (solo se importa).
// =====================================================================

import { escapeHtml } from "../../utils/html.js";
import { mostrarPaso, badgeAlumnoHtml, avatarHtml, candidatoPrincipal } from "./plantillas.js";
import { estudianteActual, listaSeleccionada, listasCache } from "./estado.js";

document.getElementById("btnIrAConfirmar").addEventListener("click", () => {
  document.getElementById("badgeAlumnoConfirmar").innerHTML =
    badgeAlumnoHtml(estudianteActual);

  if (listaSeleccionada === "blanco") {
    document.getElementById("resumenListaConfirmar").innerHTML = `
      <div class="d-flex align-items-center gap-2 mb-2">
        <div class="avatar-candidato grande">⬜</div>
        <div>
          <span class="lista-numero-tag" style="background:#6c757d;">Opción especial</span>
          <div><strong>Voto en blanco</strong></div>
          <div class="small text-muted">No elijo ninguna lista</div>
        </div>
      </div>
    `;
    document.getElementById("cargosConfirmar").innerHTML = "";
    mostrarPaso("pasoConfirmar");
    return;
  }

  const lista = listasCache.find((l) => l.id === listaSeleccionada);
  if (!lista) return;

  const principal = candidatoPrincipal(lista.candidatos);
  const resto = (lista.candidatos || []).filter((c) => c !== principal);
  const logo = lista.logo_url
    ? `<img src="${lista.logo_url}" alt="" class="lista-logo lista-logo-sm ms-2">`
    : "";

  document.getElementById("resumenListaConfirmar").innerHTML = `
    <div class="d-flex align-items-center gap-2 mb-2">
      ${avatarHtml(principal, "grande")}
      <div>
        <span class="lista-numero-tag">Lista ${lista.numero}</span>
        <div class="d-flex align-items-center"><strong>${escapeHtml(lista.nombre)}</strong>${logo}</div>
        ${principal ? `<div class="small text-muted">${escapeHtml(principal.cargo)}: ${escapeHtml(principal.nombres)} ${escapeHtml(principal.apellidos)}</div>` : ""}
      </div>
    </div>
  `;

  document.getElementById("cargosConfirmar").innerHTML =
    resto
      .map(
        (c, i) => `
    <div class="cargo-item">
      <div class="cargo-numero">${i + 1}</div>
      <div>
        <div class="small text-muted">${escapeHtml(c.cargo)}</div>
        <strong class="small">${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos)}</strong>
      </div>
    </div>
  `,
      )
      .join("") ||
    `<p class="small text-muted mb-0">Esta lista no tiene más candidatos registrados.</p>`;

  mostrarPaso("pasoConfirmar");
});

document.getElementById("btnCambiarVoto").addEventListener("click", () => {
  mostrarPaso("pasoBoleta");
});
