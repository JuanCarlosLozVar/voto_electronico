// =====================================================================
// ESTADO COMPARTIDO — resultados.html
// =====================================================================
// resultadosGeneralesCache / resultadosPorMesaCache : últimos datos
//   consultados a Supabase, reutilizados por los PDFs para no volver a
//   pedirlos.
// graficoVotosChart      : instancia de Chart.js del gráfico de barras
//   (se destruye y se vuelve a crear cada vez que cambian los datos).
// eleccionesCache        : elecciones (años) disponibles en el selector.
// eleccionSeleccionadaId : id de la elección que se está consultando.
// perfilResultados       : perfil (admin/directivo) de quien inició sesión.
// canalResultados        : canal de Supabase Realtime suscrito a
//   "eventos_resultado" para refrescar la pantalla al instante.
// =====================================================================

export let resultadosGeneralesCache = [];
export function setResultadosGeneralesCache(v) { resultadosGeneralesCache = v; }

export let resultadosPorMesaCache = [];
export function setResultadosPorMesaCache(v) { resultadosPorMesaCache = v; }

export let graficoVotosChart = null;
export function setGraficoVotosChart(v) { graficoVotosChart = v; }

export let eleccionesCache = [];
export function setEleccionesCache(v) { eleccionesCache = v; }

export let eleccionSeleccionadaId = null;
export function setEleccionSeleccionadaId(v) { eleccionSeleccionadaId = v; }

export let perfilResultados = null;
export function setPerfilResultados(v) { perfilResultados = v; }

export let canalResultados = null;
export function setCanalResultados(v) { canalResultados = v; }
