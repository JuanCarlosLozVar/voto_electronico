// =====================================================================
// SELECTS DE MESA — padron.html
// =====================================================================
// Llena el <select> de mesa del formulario de estudiante (#mesaId) y,
// si existe, el select de asignación masiva (#mesaBulkSelect).
//
// Depende de: supabaseClient, escapeHtml, estado.js (mesasCache).
// Usado por: entry.js (carga inicial) y excel-importar.js (para
// resolver "mesa_numero" del Excel a un mesa_id real).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import { mesasCache, setMesasCache } from "./estado.js";

export function opcionesMesasHTML() {
  return mesasCache
    .map(
      (m) =>
        `<option value="${m.id}">${escapeHtml(m.nombre)}${m.grado_seccion ? " — " + escapeHtml(m.grado_seccion) : ""}</option>`,
    )
    .join("");
}

export async function cargarMesasSelect() {
  const { data } = await supabaseClient
    .from("mesas")
    .select("id, numero, nombre, grado_seccion")
    .order("numero");
  setMesasCache(data || []);

  const select = document.getElementById("mesaId");
  select.innerHTML =
    '<option value="">Sin asignar</option>' + opcionesMesasHTML();

  const bulkSelect = document.getElementById("mesaBulkSelect");
  if (bulkSelect) {
    bulkSelect.innerHTML =
      '<option value="">Elegir mesa...</option>' +
      '<option value="quitar">— Quitar mesa asignada —</option>' +
      opcionesMesasHTML();
  }
}
