// =====================================================================
// DIBUJO DEL PDF "RELACIÓN DE ELECTORES" (para pegar afuera del aula)
// =====================================================================
// Equivalente a la "Relación de electores" que publica la ONPE: por
// cada mesa, una lista con N° de orden, apellidos y nombres, y DNI,
// para que el elector vea qué número le toca y el miembro de mesa no
// tenga que buscarlo en el padrón.
//
// Función pura (no toca DOM ni Supabase). A4 vertical, 2 columnas,
// 36 filas por columna (72 electores por hoja). La columna izquierda se
// llena primero y luego la derecha, igual que la ONPE.
//
// El N° de orden es la posición del elector en la lista de su mesa,
// con el MISMO orden que la "Lista de electores" de firmas (ver
// mesas-datos.js), así que ambos documentos coinciden siempre.
//
// Usado por: pdf-relacion-electores.js.
// =====================================================================

import { formatearFechaLarga, textoAjustado, textoFranjaGrupos } from "./padron-pdf-dibujo.js";

const FILAS_POR_COLUMNA = 36;
const POR_HOJA = FILAS_POR_COLUMNA * 2;

const MARGEN = 10;
const ANCHO_PAGINA = 210;
const ANCHO_CONTENIDO = ANCHO_PAGINA - MARGEN * 2; // 190
const GAP = 4;
const ANCHO_COL = (ANCHO_CONTENIDO - GAP) / 2; // 93

const ALTO_FILA = 6;
const Y_TITULOS_COL = 63;
const ALTO_TITULO_COL = 6;
const Y_FILAS = Y_TITULOS_COL + ALTO_TITULO_COL; // 69

// Anchos internos de cada columna
const ANCHO_NUM = 11;
const ANCHO_DNI = 22;
const ANCHO_NOMBRE = ANCHO_COL - ANCHO_NUM - ANCHO_DNI; // 60

function dibujarEncabezado(doc, ctx, mesa, textoFranja, hoja, totalHojas) {
  const { colegio, eleccion, insignia, anio } = ctx;

  if (insignia) {
    try {
      doc.addImage(insignia.dataUrl, insignia.formato, MARGEN, 8, 20, 20);
    } catch (e) {
      console.error("No se pudo insertar la insignia:", e);
    }
  }

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`ELECCIONES MUNICIPALES ESCOLARES ${anio}`, ANCHO_PAGINA / 2, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const nombreIe = [colegio.nombre, colegio.distrito].filter(Boolean).join(" - ").toUpperCase();
  doc.text(nombreIe || "INSTITUCIÓN EDUCATIVA", ANCHO_PAGINA / 2, 19, { align: "center" });
  const fechaLarga = formatearFechaLarga(eleccion.fecha);
  if (fechaLarga) {
    doc.text(`Fecha de votación: ${fechaLarga}`, ANCHO_PAGINA / 2, 23.5, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RELACIÓN DE ELECTORES", ANCHO_PAGINA / 2, 33, { align: "center" });

  // Recuadro grande con el N° de mesa (lo primero que busca el elector)
  const numeroMesa = String(mesa.numero).padStart(2, "0");
  doc.setLineWidth(0.5);
  doc.setDrawColor(0);
  doc.rect(MARGEN, 38, 62, 16);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("MESA DE SUFRAGIO N°", MARGEN + 2, 42.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(numeroMesa, MARGEN + 2, 52);

  // Grado y sección (o MIXTA) + hoja
  doc.setFontSize(10);
  doc.text(textoFranja, MARGEN + 68, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Hoja ${hoja} de ${totalHojas}`, MARGEN + ANCHO_CONTENIDO, 45, { align: "right" });

  // Instrucción para el elector
  doc.setFontSize(8);
  doc.text(
    "Ubica tus Apellidos y Nombres y tu Número de Orden. En la mesa indica tu Número de Orden.",
    MARGEN + 68,
    51.5,
    { maxWidth: ANCHO_CONTENIDO - 68 },
  );
}

function dibujarTitulosColumna(doc, x) {
  doc.setFillColor(230, 230, 230);
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(x, Y_TITULOS_COL, ANCHO_COL, ALTO_TITULO_COL, "FD");
  doc.line(x + ANCHO_NUM, Y_TITULOS_COL, x + ANCHO_NUM, Y_TITULOS_COL + ALTO_TITULO_COL);
  doc.line(x + ANCHO_COL - ANCHO_DNI, Y_TITULOS_COL, x + ANCHO_COL - ANCHO_DNI, Y_TITULOS_COL + ALTO_TITULO_COL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text("N°", x + ANCHO_NUM / 2, Y_TITULOS_COL + 4.1, { align: "center" });
  doc.text("APELLIDOS Y NOMBRES", x + ANCHO_NUM + ANCHO_NOMBRE / 2, Y_TITULOS_COL + 4.1, { align: "center" });
  doc.text("DNI", x + ANCHO_COL - ANCHO_DNI / 2, Y_TITULOS_COL + 4.1, { align: "center" });
}

function dibujarFila(doc, x, y, numero, e, zebra) {
  if (zebra) {
    doc.setFillColor(245, 245, 245);
    doc.rect(x, y, ANCHO_COL, ALTO_FILA, "F");
  }
  doc.setDrawColor(150);
  doc.setLineWidth(0.15);
  doc.line(x, y + ALTO_FILA, x + ANCHO_COL, y + ALTO_FILA);
  doc.setDrawColor(0);

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(String(numero).padStart(3, "0"), x + ANCHO_NUM / 2, y + 4.2, { align: "center" });

  doc.setFont("helvetica", "normal");
  const nombreCompleto = `${String(e.apellidos).toUpperCase()} ${String(e.nombres).toUpperCase()}`.trim();
  const xNombre = x + ANCHO_NUM + 1.5;
  const anchoNombre = ANCHO_NOMBRE - 3;
  doc.setFontSize(8);
  if (doc.getTextWidth(nombreCompleto) <= anchoNombre) {
    doc.text(nombreCompleto, xNombre, y + 4.2);
  } else {
    // Nombre largo: se parte en dos líneas (nunca se corta ni se sale de la celda).
    doc.setFontSize(6.3);
    const lineas = doc.splitTextToSize(nombreCompleto, anchoNombre).slice(0, 2);
    doc.text(lineas[0], xNombre, y + 2.6);
    if (lineas[1]) textoAjustado(doc, lineas[1], xNombre, y + 5.2, anchoNombre, 6.3, 4.5);
  }

  const dni = e.dni && String(e.dni).trim() ? String(e.dni).trim() : "SIN DNI";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(dni, x + ANCHO_COL - ANCHO_DNI / 2, y + 4.2, { align: "center" });
}

function dibujarMarcosColumna(doc, x, filas) {
  // Marco exterior y separadores verticales de la parte de filas
  const alto = filas * ALTO_FILA;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(x, Y_FILAS, ANCHO_COL, alto);
  doc.line(x + ANCHO_NUM, Y_FILAS, x + ANCHO_NUM, Y_FILAS + alto);
  doc.line(x + ANCHO_COL - ANCHO_DNI, Y_FILAS, x + ANCHO_COL - ANCHO_DNI, Y_FILAS + alto);
}

function dibujarPie(doc, ctx, totalElectores) {
  const { colegio, anio } = ctx;
  const nombre = (colegio.nombre || "").trim();
  const yaTienePrefijo = /^\s*(i\.?\s?e\.?|instituci[oó]n educativa)/i.test(nombre);
  const ie = [yaTienePrefijo ? "" : "I.E.", nombre, colegio.distrito ? `- ${colegio.distrito}` : ""]
    .filter(Boolean)
    .join(" ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(110);
  doc.text(
    `${ie} - Elecciones Municipales Escolares ${anio} - Total de electores de la mesa: ${totalElectores}`,
    ANCHO_PAGINA / 2,
    291,
    { align: "center" },
  );
  doc.setTextColor(0);
}

// grupos: [{ mesa: {numero,...}, estudiantes: [{dni,nombres,apellidos,grado,seccion}] }]
// Los estudiantes DEBEN venir ya ordenados (orden del padrón de la mesa).
export function construirRelacionElectoresPdf(jsPDF, { colegio, eleccion, insignia, grupos }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const anio = (/^(\d{4})/.exec(eleccion.fecha || "") || [])[1] || String(new Date().getFullYear());
  const ctx = { colegio: colegio || {}, eleccion: eleccion || {}, insignia, anio };

  let primeraPagina = true;
  grupos.forEach(({ mesa, estudiantes }) => {
    const total = estudiantes.length;
    const totalHojas = Math.max(1, Math.ceil(total / POR_HOJA));
    const textoFranja = textoFranjaGrupos(estudiantes);

    for (let hoja = 1; hoja <= totalHojas; hoja++) {
      if (!primeraPagina) doc.addPage();
      primeraPagina = false;

      dibujarEncabezado(doc, ctx, mesa, textoFranja, hoja, totalHojas);

      const desde = (hoja - 1) * POR_HOJA;
      const pagina = estudiantes.slice(desde, desde + POR_HOJA);
      const filasIzq = Math.min(pagina.length, FILAS_POR_COLUMNA);
      const filasDer = Math.max(0, pagina.length - FILAS_POR_COLUMNA);

      const xIzq = MARGEN;
      const xDer = MARGEN + ANCHO_COL + GAP;

      dibujarTitulosColumna(doc, xIzq);
      if (filasDer > 0) dibujarTitulosColumna(doc, xDer);

      pagina.forEach((e, i) => {
        const col = Math.floor(i / FILAS_POR_COLUMNA); // 0 izquierda, 1 derecha
        const fila = i % FILAS_POR_COLUMNA;
        dibujarFila(
          doc,
          col === 0 ? xIzq : xDer,
          Y_FILAS + fila * ALTO_FILA,
          desde + i + 1,
          e,
          fila % 2 === 1,
        );
      });

      dibujarMarcosColumna(doc, xIzq, filasIzq);
      if (filasDer > 0) dibujarMarcosColumna(doc, xDer, filasDer);

      dibujarPie(doc, ctx, total);
    }
  });

  return doc;
}
