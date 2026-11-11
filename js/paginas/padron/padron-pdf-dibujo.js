// =====================================================================
// DIBUJO DEL PDF "LISTA DE ELECTORES" POR MESA — padron.html
// =====================================================================
// Función pura: recibe la clase jsPDF y los datos ya preparados, dibuja
// el documento y lo devuelve. No toca el DOM ni Supabase, así que se
// puede probar de forma aislada.
//
// Formato (A4 vertical): encabezado con insignia, recuadro de "Total
// electores hábiles", franja con mesa / grado y sección / hoja, y una
// cuadrícula de 2 columnas x 10 filas (20 electores por hoja) con las
// casillas NO VOTÓ / FIRMA / HUELLA. La última hoja de cada mesa lleva
// las líneas de firma del presidente, secretario y vocal.
//
// Usado por: pdf-padron-mesas.js.
// =====================================================================

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const POR_COLUMNA = 10;
const POR_HOJA = POR_COLUMNA * 2;

const MARGEN = 12;
const ANCHO_PAGINA = 210;
const ANCHO_CONTENIDO = ANCHO_PAGINA - MARGEN * 2; // 186
const ANCHO_COL = ANCHO_CONTENIDO / 2; // 93
const ALTO_FICHA = 21.3;
const Y_INICIO_GRILLA = 52;

// "2026-12-04" -> "4 de diciembre de 2026". Se parte el texto a mano
// (sin new Date) para evitar que la zona horaria reste un día.
export function formatearFechaLarga(fechaIso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaIso || "");
  if (!m) return "";
  return `${parseInt(m[3], 10)} de ${MESES[parseInt(m[2], 10) - 1]} de ${m[1]}`;
}

// Escribe el texto reduciendo el tamaño de letra hasta que quepa.
export function textoAjustado(doc, texto, x, y, anchoMax, tamano, tamanoMin = 5.5, opciones) {
  let t = tamano;
  doc.setFontSize(t);
  while (t > tamanoMin && doc.getTextWidth(texto) > anchoMax) {
    t -= 0.5;
    doc.setFontSize(t);
  }
  doc.text(texto, x, y, opciones);
}

// Texto de grado y sección de la franja del encabezado:
//   - mesa con un solo grado y sección  -> GRADO Y SECCIÓN: 1RO "A"
//   - mesa que mezcla grados o secciones -> MIXTA
export function textoFranjaGrupos(estudiantes) {
  const grupos = new Set(
    estudiantes.map((e) => `${String(e.grado).toUpperCase()} "${String(e.seccion).toUpperCase()}"`),
  );
  return grupos.size === 1 ? `GRADO Y SECCIÓN: ${[...grupos][0]}` : "MIXTA";
}

function dibujarEncabezado(doc, ctx, mesa, totalElectores, textoFranja, hoja, totalHojas) {
  const { colegio, eleccion, insignia, anio } = ctx;

  if (insignia) {
    try {
      doc.addImage(insignia.dataUrl, insignia.formato, MARGEN, 9, 22, 22);
    } catch (e) {
      console.error("No se pudo insertar la insignia:", e);
    }
  }

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.text(`ELECCIONES MUNICIPALES ESCOLARES ${anio}`, ANCHO_PAGINA / 2, 16.2, { align: "center" });

  // Nombre de la I.E. - distrito/lugar, y debajo solo el código modular.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const nombreIe = [colegio.nombre, colegio.distrito]
    .filter(Boolean)
    .join(" - ")
    .toUpperCase();
  doc.text(nombreIe || "INSTITUCIÓN EDUCATIVA", ANCHO_PAGINA / 2, 21.2, { align: "center" });
  if (colegio.ie_codigo && String(colegio.ie_codigo).trim()) {
    doc.setFontSize(8);
    doc.text(String(colegio.ie_codigo).trim(), ANCHO_PAGINA / 2, 25.2, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("LISTA DE ELECTORES", ANCHO_PAGINA / 2, 32.6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const fechaLarga = formatearFechaLarga(eleccion.fecha);
  if (fechaLarga) {
    doc.text(`Fecha de votación: ${fechaLarga}`, ANCHO_PAGINA / 2, 38, { align: "center" });
  }

  // Recuadro "TOTAL ELECTORES HÁBILES"
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(165, 12, 33.5, 19.5);
  doc.setFontSize(6.5);
  doc.text("TOTAL ELECTORES", 181.75, 16.5, { align: "center" });
  doc.text("HÁBILES", 181.75, 19.7, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(String(totalElectores), 181.75, 28.5, { align: "center" });

  // Franja de mesa / grado y sección / hoja
  doc.setFillColor(245, 245, 245);
  doc.setLineWidth(0.3);
  doc.rect(MARGEN, 41, ANCHO_CONTENIDO, 8.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  const numeroMesa = String(mesa.numero).padStart(2, "0");
  doc.text(`MESA DE SUFRAGIO N° ${numeroMesa}`, MARGEN + 3, 46.5);
  doc.text(textoFranja, 79, 46.5);
  doc.setFontSize(9.5);
  doc.text(`Hoja ${hoja} de ${totalHojas}`, MARGEN + ANCHO_CONTENIDO - 3, 46.5, { align: "right" });
}

function dibujarFicha(doc, x, y, numero, e) {
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.rect(x, y, ANCHO_COL, ALTO_FICHA);

  // Casillas NO VOTÓ / FIRMA / HUELLA
  const ix = x + ANCHO_COL - 45.3;
  const iy = y + 1;
  const iw = 44.5;
  const ih = ALTO_FICHA - 2;
  doc.rect(ix, iy, iw, ih);
  doc.line(ix + 12.8, iy, ix + 12.8, iy + ih);
  doc.line(ix + 32, iy, ix + 32, iy + ih);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(60);
  doc.text("NO VOTÓ", ix + 1, iy + 2.6);
  doc.text("FIRMA", ix + 13.8, iy + 2.6);
  doc.text("HUELLA", ix + 33, iy + 2.6);
  doc.setTextColor(0);

  // Datos del elector
  const tx = x + 2.5;
  const anchoTexto = ix - tx - 1.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(String(numero).padStart(3, "0"), tx, y + 4);

  const dni = e.dni && String(e.dni).trim() ? String(e.dni).trim() : "SIN DNI";
  doc.setFont("helvetica", "bold");
  textoAjustado(doc, dni, tx, y + 9.6, anchoTexto, 11);

  doc.setFont("helvetica", "bold");
  textoAjustado(doc, String(e.apellidos).toUpperCase(), tx, y + 13.7, anchoTexto, 8);

  doc.setFont("helvetica", "normal");
  textoAjustado(doc, String(e.nombres).toUpperCase(), tx, y + 17.2, anchoTexto, 8);

  doc.setFontSize(5);
  doc.text(
    `${String(e.grado).toUpperCase()} - SECCIÓN ${String(e.seccion).toUpperCase()}`,
    tx,
    y + 20,
  );
}

function dibujarFirmas(doc) {
  const columnas = [
    { x: 17, etiqueta: "PRESIDENTE DE MESA" },
    { x: 79, etiqueta: "SECRETARIO" },
    { x: 141, etiqueta: "VOCAL" },
  ];
  doc.setDrawColor(0);
  doc.setLineWidth(0.25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  columnas.forEach((c) => {
    doc.line(c.x, 273, c.x + 48, 273);
    doc.text(c.etiqueta, c.x + 24, 277.5, { align: "center" });
  });
}

function dibujarPie(doc, ctx) {
  const { colegio, anio } = ctx;
  // Pie: "I.E. <nombre del colegio>". No se repite "I.E." si el nombre ya
  // empieza así (por ejemplo "I.E. N° 0773").
  const nombre = (colegio.nombre || "").trim();
  const yaTienePrefijo = /^\s*(i\.?\s?e\.?|instituci[oó]n educativa)/i.test(nombre);
  const ie = [yaTienePrefijo ? "" : "I.E.", nombre, " -- ", colegio.distrito].filter(Boolean).join(" ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(130);
  doc.text(
    `${ie} - Elecciones Municipales Escolares ${anio} - Padrón electoral`,
    ANCHO_PAGINA / 2,
    290,
    { align: "center" },
  );
  doc.setTextColor(0);
}

// grupos: [{ mesa: {numero,...}, estudiantes: [{dni,nombres,apellidos,grado,seccion}] }]
export function construirPadronPdf(jsPDF, { colegio, eleccion, insignia, grupos }) {
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

      dibujarEncabezado(doc, ctx, mesa, total, textoFranja, hoja, totalHojas);

      const desde = (hoja - 1) * POR_HOJA;
      const pagina = estudiantes.slice(desde, desde + POR_HOJA);
      pagina.forEach((e, i) => {
        const col = Math.floor(i / POR_COLUMNA); // 0 = izquierda, 1 = derecha
        const fila = i % POR_COLUMNA;
        dibujarFicha(
          doc,
          MARGEN + col * ANCHO_COL,
          Y_INICIO_GRILLA + fila * ALTO_FICHA,
          desde + i + 1,
          e,
        );
      });

      if (hoja === totalHojas) dibujarFirmas(doc);
      dibujarPie(doc, ctx);
    }
  });

  return doc;
}
