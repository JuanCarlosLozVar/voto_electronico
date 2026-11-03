// =====================================================================
// PINTADO DE LA TABLA DE ESTUDIANTES — padron.html
// =====================================================================
// Pinta las filas de la página actual (checkbox, datos, badge de
// "¿ya votó?" y botones Editar/Eliminar), y refresca los indicadores
// de selección después de pintar.
//
// Depende de: escapeHtml, estado.js (estudiantesCache, seleccionados,
// setUltimaListaRenderizada), actualizarEstadoSelectAll /
// actualizarBarraSeleccion (seleccion.js).
//
// editarEstudiante y eliminarEstudiante NO se exponen aquí: viven en
// estudiante-crud.js, que es quien realmente los define y expone en
// window (este archivo solo genera el onclick="..." que los llama).
//
// Usado por: paginacion.js (mostrarPagina) y seleccion.js
// (al marcar/desmarcar "seleccionar todos").
// =====================================================================

import { escapeHtml } from "../../utils/html.js";
import { estudiantesCache, seleccionados, setUltimaListaRenderizada } from "./estado.js";
import { actualizarEstadoSelectAll, actualizarBarraSeleccion } from "./seleccion.js";

export function pintarEstudiantes(lista) {
  setUltimaListaRenderizada(lista);
  const tbody = document.getElementById("tbodyEstudiantes");
  if (!lista.length) {
    const mensaje = estudiantesCache.length
      ? "No se encontraron estudiantes con los filtros aplicados."
      : "Aún no hay estudiantes registrados.";
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">${mensaje}</td></tr>`;
    actualizarEstadoSelectAll();
    actualizarBarraSeleccion();
    return;
  }
  tbody.innerHTML = lista
    .map(
      (e) => `
    <tr>
      <td><input type="checkbox" class="form-check-input chk-estudiante" data-id="${e.id}" ${seleccionados.has(e.id) ? "checked" : ""}></td>
      <td>${escapeHtml(e.dni)}</td>
      <td>${escapeHtml(e.nombres)}</td>
      <td>${escapeHtml(e.apellidos)}</td>
      <td>${escapeHtml(e.grado)}</td>
      <td>${escapeHtml(e.seccion)}</td>
      <td>${e.mesas ? escapeHtml(e.mesas.nombre) : '<span class="text-muted">Sin asignar</span>'}</td>
      <td>${
        e.ha_votado
          ? '<span class="badge badge-abierta">Ya votó</span>'
          : '<span class="badge badge-pendiente">Pendiente</span>'
      }</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary" onclick="editarEstudiante(${e.id})">Editar</button>
        <button class="btn btn-sm btn-outline-danger" onclick="eliminarEstudiante(${e.id})">Eliminar</button>
      </td>
    </tr>
  `,
    )
    .join("");
  actualizarEstadoSelectAll();
  actualizarBarraSeleccion();
}
