// =====================================================================
// RESUMEN NUMÉRICO DE RESULTADOS — resultados.html
// =====================================================================
// cargarResumenResultados() : llama al RPC fn_resumen_resultados, que
//   devuelve total de votos válidos, votos en blanco y total emitidos
//   para la elección seleccionada.
// cargarVotosBlancoTotal()  : atajo que solo devuelve el número de
//   votos en blanco (usado por pdf-finales.js).
//
// Depende de: supabaseClient, estado.js (eleccionSeleccionadaId).
// Usado por: grafico-general.js, pdf-finales.js.
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { eleccionSeleccionadaId } from "./estado.js";

export async function cargarResumenResultados() {
  if (!eleccionSeleccionadaId)
    return { total_votos: 0, votos_blanco: 0, total_emitidos: 0 };
  const { data, error } = await supabaseClient.rpc("fn_resumen_resultados", {
    p_eleccion_id: eleccionSeleccionadaId,
  });
  if (error) {
    console.error("Error en resumen de resultados:", error);
    return { total_votos: 0, votos_blanco: 0, total_emitidos: 0 };
  }
  return data?.[0] || { total_votos: 0, votos_blanco: 0, total_emitidos: 0 };
}

export async function cargarVotosBlancoTotal() {
  const resumen = await cargarResumenResultados();
  return Number(resumen.votos_blanco || 0);
}
