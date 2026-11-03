// =====================================================================
// BÚSQUEDA DE CANDIDATOS EN EL PADRÓN — listas.html
// =====================================================================
// Llena el <datalist id="listaPadronCandidatos"> con TODO el padrón
// para que, al agregar un candidato, se pueda buscar por nombre/DNI y
// autocompletar sus datos (candNombres, candApellidos, candEstudianteId).
//
// Depende de: supabaseClient, escapeHtml, estado.js.
// Usado por: entry.js (carga inicial).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import { setEstudiantesCache, padronPorEtiqueta, setPadronPorEtiqueta } from "./estado.js";

export async function cargarPadronParaBusqueda() {
  const { data: estudiantes } = await supabaseClient
    .from("estudiantes")
    .select("id, nombres, apellidos, dni, grado, seccion")
    .order("apellidos");
  setEstudiantesCache(estudiantes || []);

  const nuevoIndice = {};
  const datalist = document.getElementById("listaPadronCandidatos");
  datalist.innerHTML = (estudiantes || [])
    .map((e) => {
      const etiqueta = `${e.apellidos} ${e.nombres} — DNI ${e.dni} (${e.grado} ${e.seccion})`;
      nuevoIndice[etiqueta] = e;
      return `<option value="${escapeHtml(etiqueta)}"></option>`;
    })
    .join("");
  setPadronPorEtiqueta(nuevoIndice);
}

document.getElementById("candBuscarPadron").addEventListener("input", (e) => {
  const est = padronPorEtiqueta[e.target.value];
  document.getElementById("candEstudianteId").value = est ? est.id : "";
  if (est) {
    document.getElementById("candNombres").value = est.nombres;
    document.getElementById("candApellidos").value = est.apellidos;
  }
});
