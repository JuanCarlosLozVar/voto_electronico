// =====================================================================
// ACTUALIZACIÓN EN TIEMPO REAL — resultados.html
// =====================================================================
// cargarResultadosDeEleccionSeleccionada() : vuelve a pintar el
//   resultado general y la tabla por mesa (las dos vistas principales).
// suscribirResultadosTiempoReal() : se suscribe al canal de Supabase
//   Realtime de la tabla "eventos_resultado" para refrescar la
//   pantalla apenas se registre un voto nuevo, sin esperar al
//   setInterval de respaldo.
//
// Depende de: supabaseClient, estado.js, cargarResultadoGeneral
// (grafico-general.js), cargarResultadoPorMesa (tabla-por-mesa.js).
//
// Usado por: selector-eleccion.js (al cambiar de elección) y entry.js
// (carga inicial + setInterval de respaldo).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { eleccionSeleccionadaId, canalResultados, setCanalResultados } from "./estado.js";
import { cargarResultadoGeneral } from "./grafico-general.js";
import { cargarResultadoPorMesa } from "./tabla-por-mesa.js";

export async function cargarResultadosDeEleccionSeleccionada() {
  await cargarResultadoGeneral();
  await cargarResultadoPorMesa();
}

export async function suscribirResultadosTiempoReal() {
  if (canalResultados) {
    await supabaseClient.removeChannel(canalResultados);
    setCanalResultados(null);
  }
  if (!eleccionSeleccionadaId) return;

  setCanalResultados(
    supabaseClient
      .channel(`resultados-en-vivo-${eleccionSeleccionadaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "eventos_resultado",
          filter: `eleccion_id=eq.${eleccionSeleccionadaId}`,
        },
        async () => {
          const actualizado = document.getElementById("alertaTiempoReal");
          if (actualizado)
            actualizado.textContent =
              "🟢 Nuevo voto registrado. Resultados actualizados en vivo.";
          await cargarResultadosDeEleccionSeleccionada();
        },
      )
      .subscribe((status) => {
        const el = document.getElementById("alertaTiempoReal");
        if (!el) return;
        if (status === "SUBSCRIBED") {
          el.textContent =
            "🟢 Resultados en vivo: esta pantalla se actualizará automáticamente cuando se registre un nuevo voto.";
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          el.textContent =
            "🟠 Tiempo real no disponible; se hará una actualización automática periódica.";
        }
      }),
  );
}
