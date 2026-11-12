// =====================================================================
// RESULTADO GENERAL + GRÁFICO DE BARRAS — resultados.html
// =====================================================================
// Trae el RPC fn_resultados_generales (votos por lista, ya con
// porcentaje calculado en el servidor), pinta las barras de progreso,
// la lista de resumen (#resumenGeneral) y el gráfico de Chart.js.
//
// Depende de: supabaseClient, escapeHtml, estado.js,
// cargarResumenResultados (resumen.js), window.Chart (librería global).
//
// Usado por: tiempo-real.js (cargarResultadosDeEleccionSeleccionada).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import {
  eleccionSeleccionadaId, setResultadosGeneralesCache,
  graficoVotosChart, setGraficoVotosChart,
  graficoCircularChart, setGraficoCircularChart,
} from "./estado.js";
import { configBarras, configCircular } from "./graficos-config.js";
import { cargarResumenResultados } from "./resumen.js";

export async function cargarResultadoGeneral() {
  const cont0 = document.getElementById("resultadoGeneral");
  if (!eleccionSeleccionadaId) {
    cont0.innerHTML = `<p class="text-muted text-center py-4">No hay ninguna elección seleccionada.</p>`;
    return;
  }

  const { data, error } = await supabaseClient.rpc("fn_resultados_generales", {
    p_eleccion_id: eleccionSeleccionadaId,
  });

  const cont = document.getElementById("resultadoGeneral");
  const resumenEl = document.getElementById("resumenGeneral");

  if (error) {
    cont.innerHTML = `<p class="text-danger">${escapeHtml(error.message)}</p>`;
    return;
  }
  if (!data.length) {
    cont.innerHTML = `<p class="text-muted text-center py-4">Aún no hay listas registradas.</p>`;
    return;
  }

  setResultadosGeneralesCache(data);
  const resumen = await cargarResumenResultados();
  const totalVotos = Number(resumen.total_votos || 0);
  const totalBlanco = Number(resumen.votos_blanco || 0);

  cont.innerHTML =
    data
      .map(
        (l) => `
    <div class="mb-3">
      <div class="d-flex justify-content-between small mb-1">
        <span><strong>Lista ${l.numero}</strong> — ${escapeHtml(l.nombre)}</span>
        <span>${l.total_votos} votos (${l.porcentaje ?? 0}%)</span>
      </div>
      <div class="progress" style="height: .9rem;">
        <div class="progress-bar" style="width:${l.porcentaje ?? 0}%; background:var(--rojo-civico);"></div>
      </div>
    </div>
  `,
      )
      .join("") +
    (totalBlanco > 0
      ? `
    <div class="mb-1">
      <div class="d-flex justify-content-between small mb-1">
        <span><strong>⬜ Votos en blanco</strong></span>
        <span>${totalBlanco} votos</span>
      </div>
      <div class="progress" style="height: .9rem;">
        <div class="progress-bar bg-secondary" style="width:${Math.round((100 * totalBlanco) / (totalVotos + totalBlanco))}%;"></div>
      </div>
    </div>
  `
      : "");

  resumenEl.innerHTML = `
    <li class="list-group-item px-0 d-flex justify-content-between"><span>Total de votos válidos</span><strong>${totalVotos}</strong></li>
    <li class="list-group-item px-0 d-flex justify-content-between"><span>Votos en blanco</span><strong>${totalBlanco}</strong></li>
    <li class="list-group-item px-0 d-flex justify-content-between"><span>Total de votos emitidos</span><strong>${totalVotos + totalBlanco}</strong></li>
    <li class="list-group-item px-0 d-flex justify-content-between"><span>Listas participantes</span><strong>${data.length}</strong></li>
    <li class="list-group-item px-0 d-flex justify-content-between"><span>Lista en primer lugar</span><strong>${data[0]?.nombre ? escapeHtml(data[0].nombre) : "–"}</strong></li>
  `;

  const ctx = document.getElementById("graficoVotos");
  const ctxCircular = document.getElementById("graficoCircular");
  if (typeof Chart === "undefined") {
    const aviso = () =>
      Object.assign(document.createElement("p"), {
        className: "text-muted text-center py-4 mb-0",
        textContent:
          "No se pudo cargar la librería del gráfico (revisa tu conexión a internet y recarga la página).",
      });
    ctx.replaceWith(aviso());
    ctxCircular.replaceWith(aviso());
    return;
  }
  if (graficoVotosChart) graficoVotosChart.destroy();
  if (graficoCircularChart) graficoCircularChart.destroy();
  setGraficoVotosChart(new Chart(ctx, configBarras(data, totalBlanco)));
  setGraficoCircularChart(new Chart(ctxCircular, configCircular(data, totalBlanco)));
}
