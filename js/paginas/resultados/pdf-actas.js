// =====================================================================
// PDF 1: ACTAS ELECTORALES POR MESA — resultados.html
// =====================================================================
// Genera una página por mesa siguiendo el modelo de acta física
// (INSTALACIÓN / SUFRAGIO / ESCRUTINIO + firmas de mesa), usando
// jsPDF + jsPDF-AutoTable (cargados como <script> globales).
//
// Depende de: obtenerDatosActa, cargarInsigniaComoDataURL (datos-acta.js),
// estado.js (resultadosPorMesaCache).
//
// Usado por: el botón #btnExportarActas (listener registrado aquí mismo).
// =====================================================================

import { obtenerDatosActa, cargarInsigniaComoDataURL } from "./datos-acta.js";
import { resultadosPorMesaCache } from "./estado.js";

async function exportarActasPdf() {
  const btn = document.getElementById("btnExportarActas");
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Generando...";

  try {
    const {
      colegio,
      eleccion,
      mesas,
      listas,
      conteoPadron,
      conteoVotantes,
      miembrosPorMesa,
      blancoPorMesa,
    } = await obtenerDatosActa();

    if (!mesas.length) {
      Swal.fire(
        "Sin mesas",
        "Aún no hay mesas registradas para generar actas.",
        "warning",
      );
      return;
    }

    const insignia = await cargarInsigniaComoDataURL(colegio.insignia_url);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210;

    mesas.forEach((mesa, idx) => {
      if (idx > 0) doc.addPage();
      let y = 15;

      if (insignia) {
        try {
          doc.addImage(insignia.dataUrl, insignia.formato, 15, 8, 16, 16);
        } catch (e) {
          console.error("No se pudo insertar la insignia:", e);
        }
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("ELECCIÓN DEL MUNICIPIO ESCOLAR", pageW / 2, y, {
        align: "center",
      });
      y += 5;
      doc.setFontSize(9);
      const cabecera =
        [colegio.ie_codigo, colegio.nombre].filter(Boolean).join(" – ") ||
        "Institución Educativa";
      doc.text(cabecera, pageW / 2, y, { align: "center" });
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("ACTA ELECTORAL", pageW / 2, y, { align: "center" });
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Mesa: N° ${mesa.numero}`, 15, y);
      const fechaActa = eleccion.fecha ? eleccion.fecha.split("-").reverse().join("/") : "____________";
      doc.text(`Fecha: ${fechaActa}`, pageW - 15, y, {
        align: "right",
      });
      y += 8;

      // INSTALACIÓN
      doc.setFont("helvetica", "bold");
      doc.text("INSTALACIÓN", 15, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("(Llenar al inicio de la elección)", 45, y);
      y += 5;
      doc.setFontSize(10);
      doc.text("Hora de instalación de la mesa:", 15, y);
      doc.rect(75, y - 4, 25, 6);
      doc.text(
        `N° de electores (as) en el padrón: ${conteoPadron[mesa.id] || 0}`,
        108,
        y,
      );
      y += 10;

      // SUFRAGIO
      doc.setFont("helvetica", "bold");
      doc.text("SUFRAGIO", 15, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("(Llenar al término de la votación)", 42, y);
      y += 5;
      doc.setFontSize(10);
      doc.text(
        `N° de alumnos(as) que votaron (firmas en el padrón): ${conteoVotantes[mesa.id] || 0}`,
        15,
        y,
      );
      y += 10;

      // ESCRUTINIO
      doc.setFont("helvetica", "bold");
      doc.text("ESCRUTINIO", 15, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("(Llenar luego de contar los votos)", 42, y);
      y += 4;

      const votosMesa = resultadosPorMesaCache.filter(
        (r) => r.mesa_id === mesa.id,
      );
      const filas = listas.map((l) => {
        const r = votosMesa.find((x) => x.lista_id === l.id);
        return [
          `Lista N° ${l.numero} — ${l.nombre}`,
          String(r ? r.total_votos : 0),
        ];
      });
      const totalMesa = filas.reduce((acc, f) => acc + Number(f[1]), 0);
      const blancoMesa = blancoPorMesa[mesa.id] || 0;
      filas.push(["Votos en blanco", String(blancoMesa)]);
      filas.push(["Votos nulos", "0"]);
      filas.push(["Total de votos emitidos", String(totalMesa + blancoMesa)]);

      doc.autoTable({
        startY: y,
        margin: { left: 15, right: 15 },
        head: [["Concepto", "Total de votos"]],
        body: filas,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [22, 35, 63] },
        columnStyles: { 1: { halign: "center", cellWidth: 35 } },
      });

      y = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.text("Hora de fin del escrutinio:", 15, y);
      doc.rect(65, y - 4, 25, 6);
      y += 8;
      doc.text("Observaciones:", 15, y);
      y += 5;
      for (let i = 0; i < 3; i++) {
        doc.line(15, y, pageW - 15, y);
        y += 6;
      }

      y += 4;
      const miembros = miembrosPorMesa[mesa.id] || {};
      const colW = (pageW - 30) / 3;
      const cargos = [
        ["presidente", "Presidente(a) de Mesa"],
        ["secretario", "Secretario(a) de Mesa"],
        ["vocal", "Vocal de Mesa"],
      ];
      cargos.forEach(([cargo, etiqueta], i) => {
        const x = 15 + i * colW;
        doc.line(x, y, x + colW - 10, y);
      });
      y += 4;
      cargos.forEach(([cargo, etiqueta], i) => {
        const x = 15 + i * colW;
        doc.setFontSize(8);
        doc.text(etiqueta, x, y, { maxWidth: colW - 10 });
      });
      y += 6;
      cargos.forEach(([cargo, etiqueta], i) => {
        const x = 15 + i * colW;
        doc.setFontSize(7.5);
        doc.text(
          `Nombres y Apellidos: ${miembros[cargo] || "……………………"}`,
          x,
          y,
          { maxWidth: colW - 8 },
        );
        doc.text(
          `N° de DNI: ${miembros[cargo + "_dni"] || "……………"}`,
          x,
          y + 8,
          { maxWidth: colW - 8 },
        );
      });
    });

    doc.save(
      `actas_escrutinio_${(eleccion.nombre || "eleccion").replace(/\s+/g, "_")}.pdf`,
    );
  } catch (e) {
    console.error(e);
    Swal.fire("Error", "No se pudo generar el PDF de actas.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

document
  .getElementById("btnExportarActas")
  .addEventListener("click", exportarActasPdf);
