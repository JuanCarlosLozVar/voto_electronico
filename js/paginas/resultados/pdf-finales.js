// =====================================================================
// PDF 2: RESULTADOS FINALES — resultados.html
// =====================================================================
// Genera un PDF con el gráfico de barras y el circular (dibujados con
// Chart.js sobre <canvas> ocultos y convertidos a imagen; su aspecto
// viene de graficos-config.js), el ganador general, la
// tabla de votos por lista y el ganador de cada mesa.
//
// Depende de: obtenerDatosActa, cargarInsigniaComoDataURL (datos-acta.js),
// cargarVotosBlancoTotal (resumen.js), estado.js (resultadosGeneralesCache,
// resultadosPorMesaCache).
//
// Usado por: el botón #btnExportarFinal (listener registrado aquí mismo).
// =====================================================================

import { obtenerDatosActa, cargarInsigniaComoDataURL } from "./datos-acta.js";
import { cargarVotosBlancoTotal } from "./resumen.js";
import { resultadosGeneralesCache, resultadosPorMesaCache } from "./estado.js";
import { configBarras, configCircular } from "./graficos-config.js";

async function exportarResultadosFinalesPdf() {
  const btn = document.getElementById("btnExportarFinal");
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Generando...";

  try {
    if (!resultadosGeneralesCache.length) {
      Swal.fire("Sin datos", "Aún no hay resultados para exportar.", "warning");
      return;
    }

    const { colegio, eleccion } = await obtenerDatosActa();
    const totalBlanco = await cargarVotosBlancoTotal();
    const insignia = await cargarInsigniaComoDataURL(colegio.insignia_url);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210;
    let y = 15;

    if (insignia) {
      try {
        doc.addImage(insignia.dataUrl, insignia.formato, 15, 8, 18, 18);
      } catch (e) {
        console.error("No se pudo insertar la insignia:", e);
      }
    }

    doc.setFontSize(11);
    const cabecera =
      [colegio.ie_codigo, colegio.nombre].filter(Boolean).join(" – ") ||
      "Institución Educativa";
    doc.text(cabecera, pageW / 2, y, { align: "center" });
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("RESULTADOS FINALES", pageW / 2, y, { align: "center" });
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      eleccion.nombre || "Elección del Municipio Escolar",
      pageW / 2,
      y,
      { align: "center" },
    );
    y += 5;
    doc.setFontSize(8.5);
    doc.text(
      `Generado el ${new Date().toLocaleString("es-PE")}`,
      pageW / 2,
      y,
      { align: "center" },
    );
    y += 10;

    // Ganador
    const ganador = resultadosGeneralesCache[0];
    const totalVotos = resultadosGeneralesCache.reduce(
      (acc, l) => acc + Number(l.total_votos),
      0,
    );
    doc.setFillColor(200, 16, 46);
    doc.roundedRect(15, y, pageW - 30, 16, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(
      `Lista ganadora: Lista ${ganador.numero} — ${ganador.nombre} (${ganador.total_votos} votos, ${ganador.porcentaje ?? 0}%)`,
      pageW / 2,
      y + 10,
      { align: "center", maxWidth: pageW - 40 },
    );
    doc.setTextColor(0, 0, 0);
    y += 24;

    // Gráficos: barras + circular, lado a lado. Se dibujan con Chart.js en
    // canvas ocultos al doble de tamaño (escala 2) para que queden nítidos
    // al reducirlos en la hoja.
    async function graficoComoImagen(config, ancho, alto) {
      const canvas = document.createElement("canvas");
      canvas.width = ancho;
      canvas.height = alto;
      const chart = new Chart(canvas, config);
      await new Promise((r) => setTimeout(r, 150));
      const img = canvas.toDataURL("image/png");
      chart.destroy();
      return img;
    }

    const opcionesPdf = { escala: 2, animar: false };
    const anchoBarrasMm = 104,
      anchoCircMm = 72,
      altoMm = 62,
      huecoMm = 4;
    const pxPorMm = 10; // 10 px de canvas por mm de hoja
    const imgBarras = await graficoComoImagen(
      configBarras(resultadosGeneralesCache, totalBlanco, { ...opcionesPdf, nombreCompleto: false }),
      anchoBarrasMm * pxPorMm,
      altoMm * pxPorMm,
    );
    const imgCircular = await graficoComoImagen(
      configCircular(resultadosGeneralesCache, totalBlanco, opcionesPdf),
      anchoCircMm * pxPorMm,
      altoMm * pxPorMm,
    );
    doc.addImage(imgBarras, "PNG", 15, y, anchoBarrasMm, altoMm);
    doc.addImage(imgCircular, "PNG", 15 + anchoBarrasMm + huecoMm, y, anchoCircMm, altoMm);
    y += altoMm + 8;

    doc.autoTable({
      startY: y,
      margin: { left: 15, right: 15 },
      head: [["Lista", "Votos", "Porcentaje"]],
      body: [
        ...resultadosGeneralesCache.map((l) => [
          `Lista ${l.numero} — ${l.nombre}`,
          l.total_votos,
          `${l.porcentaje ?? 0}%`,
        ]),
        [
          "Votos en blanco",
          totalBlanco,
          totalBlanco
            ? `${Math.round((100 * totalBlanco) / (totalVotos + totalBlanco))}%`
            : "0%",
        ],
      ],
      foot: [["Total de votos emitidos", totalVotos + totalBlanco, "100%"]],
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [22, 35, 63] },
      footStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Ganador por mesa
    if (y > 250) {
      doc.addPage();
      y = 15;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Resultado por mesa", 15, y);
    y += 4;

    const mesasAgrupadas = {};
    const listasNombres = new Map();
    resultadosPorMesaCache.forEach((r) => {
      mesasAgrupadas[r.mesa_id] = mesasAgrupadas[r.mesa_id] || {
        nombre: r.mesa_nombre,
        votos: {},
      };
      mesasAgrupadas[r.mesa_id].votos[r.lista_id] = r.total_votos;
      listasNombres.set(r.lista_id, r.lista_nombre);
    });

    const filasMesa = Object.values(mesasAgrupadas).map((m) => {
      let ganadoraMesa = "Sin votos aún",
        max = -1,
        totalMesa = 0;
      Object.entries(m.votos).forEach(([id, v]) => {
        totalMesa += v;
        if (v > max) {
          max = v;
          ganadoraMesa = listasNombres.get(Number(id));
        }
      });
      if (max <= 0) ganadoraMesa = "Sin votos aún";
      return [m.nombre, ganadoraMesa, String(totalMesa)];
    });

    doc.autoTable({
      startY: y,
      margin: { left: 15, right: 15 },
      head: [["Mesa", "Lista ganadora", "Total de votos"]],
      body: filasMesa,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [22, 35, 63] },
    });

    doc.save(
      `resultados_finales_${(eleccion.nombre || "eleccion").replace(/\s+/g, "_")}.pdf`,
    );
  } catch (e) {
    console.error(e);
    Swal.fire(
      "Error",
      "No se pudo generar el PDF de resultados finales.",
      "error",
    );
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

document
  .getElementById("btnExportarFinal")
  .addEventListener("click", exportarResultadosFinalesPdf);
