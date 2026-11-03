// =====================================================================
// CARGA DEL PADRÓN — padron.html
// =====================================================================
// Trae todos los estudiantes junto con su mesa asignada, calcula
// "¿ya votó?" contra la tabla "votantes" de la ELECCIÓN ACTUAL (no es
// un flag fijo: un mismo estudiante puede volver a votar cada año), y
// dispara el resto de la UI (tarjetas resumen, filtros, tabla).
//
// Depende de: supabaseClient, escapeHtml, estado.js.
// Usado por: entry.js (carga inicial + auto-refresco cada 10s), y por
// casi todos los módulos de CRUD/importación tras guardar cambios.
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import { setEstudiantesCache, estudiantesCache } from "./estado.js";
import { poblarFiltrosGradoSeccion, obtenerListaFiltrada } from "./filtros.js";
import { mostrarPagina } from "./paginacion.js";

export async function cargarEstudiantes() {
  const { data, error } = await supabaseClient
    .from("estudiantes")
    .select("id, dni, nombres, apellidos, grado, seccion, mesa_id, mesas(nombre)")
    .order("apellidos");

  const tbody = document.getElementById("tbodyEstudiantes");
  if (error) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-danger text-center py-4">${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  const { data: eleccionData } = await supabaseClient
    .from("eleccion")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  const eleccionActualId = eleccionData && eleccionData.length ? eleccionData[0].id : null;

  let votantesSet = new Set();
  if (eleccionActualId) {
    const { data: votantes } = await supabaseClient
      .from("votantes")
      .select("estudiante_id")
      .eq("eleccion_id", eleccionActualId);
    votantesSet = new Set((votantes || []).map((v) => v.estudiante_id));
  }

  setEstudiantesCache(
    (data || []).map((e) => ({ ...e, ha_votado: votantesSet.has(e.id) })),
  );
  actualizarTarjetasResumen();
  poblarFiltrosGradoSeccion();
  mostrarPagina(obtenerListaFiltrada());
}

export function actualizarTarjetasResumen() {
  const total = estudiantesCache.length;
  const sinMesa = estudiantesCache.filter((e) => !e.mesa_id).length;
  const votaron = estudiantesCache.filter((e) => e.ha_votado).length;

  document.getElementById("statTotalEstudiantes").textContent = total;

  const statSinMesa = document.getElementById("statSinMesa");
  statSinMesa.textContent = sinMesa;
  statSinMesa.classList.toggle("text-danger", sinMesa > 0);

  document.getElementById("statYaVotaron").textContent = votaron;
}
