// =====================================================================
// ELECCIÓN ACTUAL — listas.html
// =====================================================================
// Cada lista y sus candidatos quedan ligados a UNA elección
// (eleccion_id), así el historial de años anteriores no se mezcla con
// el año en curso. Esta función detecta cuál es esa elección y avisa
// en pantalla si todavía no se ha configurado ninguna.
//
// Depende de: supabaseClient, estado.js.
// Usado por: entry.js (carga inicial).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { setEleccionActualId } from "./estado.js";

export async function cargarEleccionActual() {
  const { data } = await supabaseClient
    .from("eleccion")
    .select("id, nombre, fecha")
    .order("id", { ascending: false })
    .limit(1);

  const aviso = document.getElementById("avisoEleccion");
  const btnNueva = document.getElementById("btnNuevaListaTop");

  if (!data || !data.length) {
    setEleccionActualId(null);
    aviso.innerHTML = `⚠️ Aún no hay ninguna elección configurada — ve primero a <a href="jornada.html">Jornada electoral</a>.`;
    btnNueva.disabled = true;
    return;
  }
  setEleccionActualId(data[0].id);
  aviso.textContent = `Mostrando listas de: ${data[0].nombre} (${data[0].fecha})`;
  btnNueva.disabled = false;
}
