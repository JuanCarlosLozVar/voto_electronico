// =====================================================================
// RESULTADOS POR MESA (tabla) — resultados.html
// =====================================================================
// Trae el RPC fn_resultados_por_mesa + fn_votos_blanco_por_mesa,
// agrupa los votos por mesa/lista y arma la tabla #tablaPorMesa con
// una columna por lista y la lista ganadora de cada mesa.
//
// Depende de: supabaseClient, escapeHtml, estado.js.
// Usado por: tiempo-real.js (cargarResultadosDeEleccionSeleccionada) y
// pdf-actas.js (usa resultadosPorMesaCache que aquí se llena).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import { eleccionSeleccionadaId, setResultadosPorMesaCache } from "./estado.js";

export async function cargarResultadoPorMesa() {
  const tbody = document.querySelector("#tablaPorMesa tbody");

  if (!eleccionSeleccionadaId) {
    tbody.innerHTML = `<tr><td class="text-muted">No hay ninguna elección seleccionada.</td></tr>`;
    return;
  }

  const { data, error } = await supabaseClient.rpc("fn_resultados_por_mesa", {
    p_eleccion_id: eleccionSeleccionadaId,
  });

  if (error) {
    tbody.innerHTML = `<tr><td class="text-danger">${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = `<tr><td class="text-muted">Sin datos aún.</td></tr>`;
    return;
  }

  setResultadosPorMesaCache(data);
  const { data: blancosMesa } = await supabaseClient.rpc(
    "fn_votos_blanco_por_mesa",
    { p_eleccion_id: eleccionSeleccionadaId },
  );
  const blancoPorMesa = {};
  (blancosMesa || []).forEach((x) => {
    blancoPorMesa[x.mesa_id] = Number(x.votos_blanco || 0);
  });

  // Agrupar por mesa
  const mesas = {};
  const listasSet = new Map();
  data.forEach((r) => {
    if (!mesas[r.mesa_id])
      mesas[r.mesa_id] = { nombre: r.mesa_nombre, votos: {} };
    mesas[r.mesa_id].votos[r.lista_id] = r.total_votos;
    listasSet.set(r.lista_id, r.lista_nombre);
  });

  const theadRow = document.querySelector("#tablaPorMesa thead tr");
  theadRow.innerHTML =
    "<th>Mesa</th>" +
    Array.from(listasSet.entries())
      .map(([id, nombre]) => `<th>${escapeHtml(nombre)}</th>`)
      .join("") +
    "<th>⬜ En blanco</th><th>Lista ganadora</th>";

  tbody.innerHTML = Object.entries(mesas)
    .map(([mesaId, m]) => {
      let ganadora = "–",
        max = -1;
      Array.from(listasSet.entries()).forEach(([id, nombre]) => {
        const v = m.votos[id] ?? 0;
        if (v > max) {
          max = v;
          ganadora = nombre;
        }
      });
      if (max <= 0) ganadora = "Sin votos aún";
      return `
      <tr>
        <td><strong>${m.nombre}</strong></td>
        ${Array.from(listasSet.keys())
          .map((id) => `<td>${m.votos[id] ?? 0}</td>`)
          .join("")}
        <td>${blancoPorMesa[mesaId] ?? 0}</td>
        <td><strong>${ganadora}</strong></td>
      </tr>
    `;
    })
    .join("");
}
