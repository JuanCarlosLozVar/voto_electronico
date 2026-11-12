// =====================================================================
// CONFIGURACIÓN DE GRÁFICOS (barras + circular) — resultados.html
// =====================================================================
// Un solo lugar donde se define cómo se ven los gráficos de Chart.js.
// Lo usan la pantalla (grafico-general.js) y el PDF de resultados
// finales (pdf-finales.js), así ambos se ven igual.
//
// - Barras delgadas (máx. 46 px), con el número de votos encima.
// - Circular (anillo) con porcentaje en cada porción y el total al centro.
// - "escala" multiplica tamaños de letra y márgenes: 1 en pantalla, 2 en
//   el canvas oculto del PDF (que se dibuja más grande para que quede
//   nítido al reducirlo en la hoja).
//
// Sin dependencias: solo recibe datos y devuelve la configuración.
// =====================================================================

// Colores por lista (la 1.ª de la lista ordenada, la ganadora, va en rojo
// cívico). El voto en blanco siempre va en gris.
export const PALETA_LISTAS = [
  "#c8102e", "#1f335c", "#e0a526", "#2a9d8f", "#7b5ea7", "#e76f51", "#4d908e", "#8d6e63",
];
export const COLOR_BLANCO = "#aab2bd";

const FUENTE = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const COLOR_TEXTO = "#374151";
const COLOR_GRILLA = "#e8eaee";

export function colorLista(i) {
  return PALETA_LISTAS[i % PALETA_LISTAS.length];
}

// Fondo blanco sólido (solo para el PDF; un PNG transparente puede verse
// negro en algunos visores).
const pluginFondoBlanco = {
  id: "fondoBlanco",
  beforeDraw(chart) {
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

// ---- Gráfico de barras ------------------------------------------------
const pluginValoresBarras = {
  id: "valoresBarras",
  afterDatasetsDraw(chart, _args, opts) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const datos = chart.data.datasets[0].data;
    ctx.save();
    ctx.fillStyle = "#111827";
    ctx.font = `600 ${opts.tamano}px ${FUENTE}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    meta.data.forEach((barra, i) => {
      ctx.fillText(String(datos[i]), barra.x, barra.y - 4 * (opts.escala || 1));
    });
    ctx.restore();
  },
};

// listas: [{ numero, nombre, total_votos }]; blanco: votos en blanco (si es
// mayor que 0 se agrega una barra gris al final, igual que en el circular)
export function configBarras(listas, blanco = 0, { escala = 1, nombreCompleto = true, animar = true } = {}) {
  const tam = 12 * escala;
  const hayBlanco = Number(blanco) > 0;
  const etiquetas = listas.map((l) =>
    nombreCompleto ? [`Lista ${l.numero}`, String(l.nombre)] : `Lista ${l.numero}`,
  );
  const valores = listas.map((l) => Number(l.total_votos));
  const colores = listas.map((_, i) => colorLista(i));
  if (hayBlanco) {
    etiquetas.push(nombreCompleto ? ["Voto en", "blanco"] : "En blanco");
    valores.push(Number(blanco));
    colores.push(COLOR_BLANCO);
  }
  return {
    type: "bar",
    plugins: escala > 1 ? [pluginValoresBarras, pluginFondoBlanco] : [pluginValoresBarras],
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: "Votos",
          data: valores,
          backgroundColor: colores,
          borderRadius: 5 * escala,
          borderSkipped: false,
          maxBarThickness: 46 * escala,
          barPercentage: 0.55,
          categoryPercentage: 0.8,
        },
      ],
    },
    options: {
      responsive: escala === 1,
      maintainAspectRatio: false,
      animation: animar ? undefined : false,
      layout: { padding: { top: 20 * escala, right: 6 * escala } },
      plugins: {
        legend: { display: false },
        valoresBarras: { tamano: tam + escala, escala },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: COLOR_GRILLA },
          ticks: { color: COLOR_TEXTO, font: { size: tam, family: FUENTE } },
        },
        y: {
          beginAtZero: true,
          grace: "10%",
          border: { display: false },
          grid: { color: COLOR_GRILLA },
          ticks: {
            precision: 0,
            color: "#6b7280",
            font: { size: tam - escala, family: FUENTE },
          },
        },
      },
    },
  };
}

// ---- Gráfico circular (anillo) ---------------------------------------
const pluginTextoCentro = {
  id: "textoCentro",
  afterDraw(chart, _args, opts) {
    const area = chart.chartArea;
    if (!area) return;
    const { ctx } = chart;
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#111827";
    ctx.font = `700 ${opts.tamanoNumero}px ${FUENTE}`;
    ctx.fillText(String(opts.total), cx, cy - opts.tamanoNumero * 0.1);
    ctx.fillStyle = "#6b7280";
    ctx.font = `500 ${opts.tamanoTexto}px ${FUENTE}`;
    ctx.fillText("votos", cx, cy + opts.tamanoNumero * 0.62);
    ctx.restore();
  },
};

const pluginPorcentajes = {
  id: "porcentajesCirculo",
  afterDatasetsDraw(chart, _args, opts) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const datos = chart.data.datasets[0].data;
    const total = datos.reduce((a, b) => a + b, 0);
    if (!total) return;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${opts.tamano}px ${FUENTE}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    meta.data.forEach((arco, i) => {
      const pct = (100 * datos[i]) / total;
      if (pct < 7) return; // porciones muy chicas: sin texto (cabría mal)
      const p = arco.tooltipPosition();
      ctx.fillText(`${Math.round(pct)}%`, p.x, p.y);
    });
    ctx.restore();
  },
};

// listas: [{ numero, nombre, total_votos }]; blanco: número de votos en blanco
export function configCircular(listas, blanco = 0, { escala = 1, animar = true } = {}) {
  const etiquetas = listas.map((l) => `Lista ${l.numero} — ${l.nombre}`);
  const valores = listas.map((l) => Number(l.total_votos));
  const colores = listas.map((_, i) => colorLista(i));
  if (Number(blanco) > 0) {
    etiquetas.push("Voto en blanco");
    valores.push(Number(blanco));
    colores.push(COLOR_BLANCO);
  }
  const total = valores.reduce((a, b) => a + b, 0);
  const tam = 12 * escala;

  return {
    type: "doughnut",
    plugins: escala > 1 ? [pluginTextoCentro, pluginPorcentajes, pluginFondoBlanco] : [pluginTextoCentro, pluginPorcentajes],
    data: {
      labels: etiquetas,
      datasets: [
        {
          data: valores,
          backgroundColor: colores,
          borderColor: "#ffffff",
          borderWidth: 2 * escala,
          hoverOffset: 4 * escala,
        },
      ],
    },
    options: {
      responsive: escala === 1,
      maintainAspectRatio: false,
      animation: animar ? undefined : false,
      cutout: "58%",
      layout: { padding: 4 * escala },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: COLOR_TEXTO,
            boxWidth: 10 * escala,
            boxHeight: 10 * escala,
            padding: 8 * escala,
            font: { size: tam - escala, family: FUENTE },
          },
        },
        textoCentro: { total, tamanoNumero: 24 * escala, tamanoTexto: 11 * escala },
        porcentajesCirculo: { tamano: tam },
      },
    },
  };
}
