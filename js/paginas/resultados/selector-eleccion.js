// =====================================================================
// SELECTOR DE ELECCIÓN (AÑO) — resultados.html
// =====================================================================
// Cada elección (año) queda separada de las demás: este selector deja
// consultar tanto el año en curso como el historial de años anteriores.
//
// Depende de: supabaseClient, escapeHtml, estado.js,
// cargarResultadosDeEleccionSeleccionada y suscribirResultadosTiempoReal
// (tiempo-real.js).
//
// Usado por: entry.js (carga inicial).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import { setEleccionesCache, setEleccionSeleccionadaId } from "./estado.js";
import { cargarResultadosDeEleccionSeleccionada, suscribirResultadosTiempoReal } from "./tiempo-real.js";

export async function cargarEleccionesDisponibles() {
  const { data, error } = await supabaseClient
    .from("eleccion")
    .select("id, nombre, fecha, estado")
    .order("id", { ascending: false });

  const select = document.getElementById("selectorEleccion");
  if (error || !data || !data.length) {
    select.innerHTML = `<option>Sin elecciones registradas</option>`;
    select.disabled = true;
    return;
  }
  setEleccionesCache(data);
  select.disabled = false;
  select.innerHTML = data
    .map(
      (el) =>
        `<option value="${el.id}">${escapeHtml(el.nombre)} — ${el.fecha}${el.estado === "abierta" ? " (en curso)" : ""}</option>`,
    )
    .join("");
  setEleccionSeleccionadaId(data[0].id); // la más reciente por defecto
  select.value = data[0].id;
}

document.getElementById("selectorEleccion").addEventListener("change", (e) => {
  setEleccionSeleccionadaId(e.target.value ? Number(e.target.value) : null);
  cargarResultadosDeEleccionSeleccionada();
  suscribirResultadosTiempoReal();
});
