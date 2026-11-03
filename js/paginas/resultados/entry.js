// =====================================================================
// PUNTO DE ENTRADA — resultados.html
// =====================================================================
// Reemplaza a js/supabase/supabaseClient.js + js/resultados.js.
// Accesible para admin y directivo (requireResultsSession); los
// directivos no ven los botones de exportar PDF.
// =====================================================================

import { requireResultsSession } from "../../supabase/auth.js";
import { ajustarNavegacionPorRol } from "../../supabase/navegacion.js";
import { setPerfilResultados } from "./estado.js";
import { cargarEleccionesDisponibles } from "./selector-eleccion.js";
import { cargarResultadosDeEleccionSeleccionada, suscribirResultadosTiempoReal } from "./tiempo-real.js";
import "./pdf-actas.js";   // conecta el botón "Exportar actas"
import "./pdf-finales.js"; // conecta el botón "Exportar resultados finales"

(async () => {
  const perfilResultados = await requireResultsSession();
  if (!perfilResultados) return;
  setPerfilResultados(perfilResultados);

  await ajustarNavegacionPorRol();
  const rolEl = document.getElementById("rolResultados");
  if (rolEl) {
    rolEl.innerHTML =
      perfilResultados.rol === "directivo"
        ? `<span class="badge bg-primary">${perfilResultados.subrol === "subdirector" ? "Subdirector" : "Director"}</span> · Vista de resultados en tiempo real`
        : `<span class="badge bg-dark">Administrador</span> · Vista completa de resultados`;
  }

  if (perfilResultados.rol === "directivo") {
    document.getElementById("btnExportarActas").classList.add("d-none");
    document.getElementById("btnExportarFinal").classList.add("d-none");
  }

  await cargarEleccionesDisponibles();
  await cargarResultadosDeEleccionSeleccionada();
  await suscribirResultadosTiempoReal();

  // Respaldo: si el navegador no logra mantener Realtime, refrescamos
  // cada 15 segundos sin duplicar suscripciones.
  setInterval(async () => {
    await cargarResultadosDeEleccionSeleccionada();
  }, 15000);
})();
