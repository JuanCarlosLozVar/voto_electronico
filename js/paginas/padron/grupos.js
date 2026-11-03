// =====================================================================
// ASIGNACIÓN MASIVA POR GRADO Y SECCIÓN — padron.html
// =====================================================================
// La herramienta principal de asignación: agrupa el padrón por
// "grado + sección" y permite asignar (o quitar) una mesa a TODO un
// grupo de un solo clic, con una sugerencia automática de mesa cuando
// su "grado_seccion" coincide con el del grupo.
//
// Depende de: supabaseClient, escapeHtml, estado.js (estudiantesCache,
// mesasCache), cargarMesasSelect (mesas-select.js), cargarEstudiantes
// (estudiantes-data.js).
//
// asignarGrupo se expone en window porque los botones "Asignar" de la
// tabla de grupos (generados en pintarGrupos) lo llaman con
// onclick="asignarGrupo(this)".
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import { estudiantesCache, mesasCache } from "./estado.js";
import { cargarMesasSelect } from "./mesas-select.js";
import { cargarEstudiantes } from "./estudiantes-data.js";

function calcularGrupos() {
  const mapa = {};
  estudiantesCache.forEach((e) => {
    const clave = `${e.grado}||${e.seccion}`;
    if (!mapa[clave]) mapa[clave] = { grado: e.grado, seccion: e.seccion, total: 0, mesaIds: new Set() };
    mapa[clave].total++;
    mapa[clave].mesaIds.add(e.mesa_id || null);
  });
  return Object.values(mapa).sort(
    (a, b) =>
      a.grado.localeCompare(b.grado, "es", { numeric: true }) ||
      a.seccion.localeCompare(b.seccion, "es", { numeric: true }),
  );
}

export function pintarGrupos() {
  const tbody = document.getElementById("tbodyGrupos");
  const grupos = calcularGrupos();

  if (!grupos.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No hay estudiantes en el padrón todavía.</td></tr>`;
    return;
  }

  tbody.innerHTML = grupos
    .map((g) => {
      const mesasDistintas = [...g.mesaIds];
      let mesaActualTexto;
      if (mesasDistintas.length === 1) {
        const mesaId = mesasDistintas[0];
        const mesa = mesaId ? mesasCache.find((m) => m.id === mesaId) : null;
        mesaActualTexto = mesa ? escapeHtml(mesa.nombre) : '<span class="text-muted">Sin asignar</span>';
      } else {
        mesaActualTexto = '<span class="text-warning">Varias mesas</span>';
      }

      // Sugerencia automática: busca una mesa cuyo "grado_seccion" coincida
      // con este grupo (ej. mesa "1ro Secundaria - A" para grado=1ro, seccion=A).
      const claveGrupo = `${g.grado} ${g.seccion}`.trim().toLowerCase();
      const sugerida = mesasCache.find((m) => (m.grado_seccion || "").trim().toLowerCase() === claveGrupo);

      return `
      <tr>
        <td>${escapeHtml(g.grado)}</td>
        <td>${escapeHtml(g.seccion)}</td>
        <td>${g.total}</td>
        <td>${mesaActualTexto}</td>
        <td>
          <div class="d-flex gap-2">
            <select class="form-select form-select-sm selectGrupoMesa" data-grado="${escapeHtml(g.grado)}" data-seccion="${escapeHtml(g.seccion)}">
              <option value="">Elegir mesa...</option>
              <option value="quitar">— Quitar mesa asignada —</option>
              ${mesasCache.map((m) => `<option value="${m.id}" ${sugerida && sugerida.id === m.id ? "selected" : ""}>${escapeHtml(m.nombre)}${m.grado_seccion ? " — " + escapeHtml(m.grado_seccion) : ""}</option>`).join("")}
            </select>
            <button type="button" class="btn btn-sm btn-civico text-nowrap" onclick="asignarGrupo(this)">Asignar</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

export async function asignarGrupo(boton) {
  const select = boton.previousElementSibling;
  const grado = select.dataset.grado;
  const seccion = select.dataset.seccion;
  const valor = select.value;

  if (valor === "") {
    Swal.fire("Elige una mesa", "Selecciona una mesa o la opción para quitar la asignación.", "warning");
    return;
  }
  const mesaId = valor === "quitar" ? null : valor;

  const confirm = await Swal.fire({
    title: `¿Asignar "${grado} ${seccion}" a esta mesa?`,
    text: mesaId
      ? "Todos los alumnos de este grupo quedarán asignados a la mesa elegida."
      : "Se quitará la mesa asignada a todos los alumnos de este grupo.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, asignar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#c8102e",
  });
  if (!confirm.isConfirmed) return;

  const { error } = await supabaseClient
    .from("estudiantes")
    .update({ mesa_id: mesaId })
    .eq("grado", grado)
    .eq("seccion", seccion);

  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }

  await cargarEstudiantes();
  pintarGrupos();
  Swal.fire({
    icon: "success",
    title: "Grupo asignado",
    text: `"${grado} ${seccion}" se actualizó correctamente.`,
    timer: 1800,
    showConfirmButton: false,
  });
}
window.asignarGrupo = asignarGrupo;

document.getElementById("modalAsignarGrupos").addEventListener("show.bs.modal", async () => {
  await cargarMesasSelect();
  pintarGrupos();
});
