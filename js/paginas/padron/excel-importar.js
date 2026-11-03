// =====================================================================
// IMPORTACIÓN MASIVA DESDE EXCEL — padron.html
// =====================================================================
// Flujo completo de importación: descargar plantilla → elegir archivo
// → previsualizar (validando fila por fila, resolviendo "mesa_numero"
// contra las mesas reales) → confirmar (upsert por DNI, así que
// reimportar el mismo archivo actualiza en vez de duplicar).
//
// Depende de: supabaseClient, escapeHtml, estado.js, mesasCache/
// cargarMesasSelect (mesas-select.js), cargarEstudiantes
// (estudiantes-data.js), window.XLSX (librería global SheetJS).
//
// descargarPlantilla y confirmarImportacion se exponen en window
// porque los botones del HTML los llaman con onclick="...".
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import { mesasCache, filasImportar, setFilasImportar, modalImportar } from "./estado.js";
import { cargarMesasSelect } from "./mesas-select.js";
import { cargarEstudiantes } from "./estudiantes-data.js";

export function descargarPlantilla() {
  const datosEjemplo = [
    { dni: "70123456", nombres: "Ana", apellidos: "Torres Rojas", grado: "3ro", seccion: "A" },
    { dni: "70123457", nombres: "Luis", apellidos: "Mamani Quispe", grado: "3ro", seccion: "A" },
  ];
  const hoja = XLSX.utils.json_to_sheet(datosEjemplo);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Estudiantes");
  XLSX.writeFile(libro, "plantilla_padron.xlsx");
}
window.descargarPlantilla = descargarPlantilla;

// Normaliza encabezados: quita espacios, tildes y pasa a minúsculas
function normalizarClave(k) {
  return k
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

document.getElementById("archivoExcel").addEventListener("change", async (e) => {
  const archivo = e.target.files[0];
  const msg = document.getElementById("mensajeImportar");
  msg.innerHTML = "";
  if (!archivo) return;

  if (!mesasCache.length) await cargarMesasSelect();
  const mesasPorNumero = {};
  mesasCache.forEach((m) => {
    if (m.numero !== undefined) mesasPorNumero[m.numero] = m;
  });
  // cargarMesasSelect solo trae id/nombre; necesitamos numero también
  const { data: mesasCompletas } = await supabaseClient.from("mesas").select("id, numero, nombre");
  (mesasCompletas || []).forEach((m) => {
    mesasPorNumero[m.numero] = m;
  });

  const buffer = await archivo.arrayBuffer();
  const libro = XLSX.read(buffer, { type: "array" });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filasCrudas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

  if (!filasCrudas.length) {
    msg.innerHTML = `<div class="alert alert-warning mb-0">El archivo no tiene filas de datos.</div>`;
    return;
  }

  setFilasImportar(
    filasCrudas.map((fila, i) => {
      const normal = {};
      Object.keys(fila).forEach((k) => {
        normal[normalizarClave(k)] = fila[k];
      });

      const dni = String(normal.dni || "").trim();
      const nombres = String(normal.nombres || "").trim();
      const apellidos = String(normal.apellidos || "").trim();
      const grado = String(normal.grado || "").trim();
      const seccion = String(normal.seccion || "").trim();
      const mesaNumero =
        normal.mesa_numero !== undefined && normal.mesa_numero !== "" ? Number(normal.mesa_numero) : null;

      const errores = [];
      if (!dni) errores.push("falta DNI");
      if (!nombres) errores.push("falta nombres");
      if (!apellidos) errores.push("falta apellidos");
      if (!grado) errores.push("falta grado");
      if (!seccion) errores.push("falta sección");

      let mesaId = null, mesaTexto = "Sin asignar";
      if (mesaNumero !== null) {
        const mesa = mesasPorNumero[mesaNumero];
        if (mesa) {
          mesaId = mesa.id;
          mesaTexto = mesa.nombre;
        } else {
          errores.push(`mesa ${mesaNumero} no existe`);
          mesaTexto = `Mesa ${mesaNumero} no encontrada`;
        }
      }

      return {
        fila: i + 2, // +2: fila 1 es encabezado, arrays son 0-index
        dni, nombres, apellidos, grado, seccion,
        mesa_id: mesaId,
        mesa_texto: mesaTexto,
        valido: errores.length === 0,
        errores,
      };
    }),
  );

  pintarPreview();
});

function pintarPreview() {
  document.getElementById("importarPasoArchivo").classList.add("d-none");
  document.getElementById("importarPasoPreview").classList.remove("d-none");

  const validas = filasImportar.filter((f) => f.valido).length;
  const invalidas = filasImportar.length - validas;

  document.getElementById("resumenPreview").innerHTML =
    `<strong>${filasImportar.length}</strong> fila(s) leídas — ` +
    `<span class="text-success">${validas} listas para importar</span>` +
    (invalidas ? `, <span class="text-danger">${invalidas} con errores (se omitirán)</span>` : "");

  document.getElementById("tbodyPreview").innerHTML = filasImportar
    .map(
      (f) => `
    <tr class="${f.valido ? "" : "table-danger"}">
      <td>${f.fila}</td>
      <td>${escapeHtml(f.dni) || "–"}</td>
      <td>${escapeHtml(f.nombres) || "–"}</td>
      <td>${escapeHtml(f.apellidos) || "–"}</td>
      <td>${escapeHtml(f.grado) || "–"}</td>
      <td>${escapeHtml(f.seccion) || "–"}</td>
      <td>${escapeHtml(f.mesa_texto)}</td>
      <td>${f.valido ? '<span class="badge badge-abierta">OK</span>' : `<span class="badge badge-cerrada" title="${escapeHtml(f.errores.join(", "))}">${escapeHtml(f.errores.join(", "))}</span>`}</td>
    </tr>
  `,
    )
    .join("");

  document.getElementById("btnConfirmarImportacion").classList.toggle("d-none", validas === 0);
}

export async function confirmarImportacion() {
  const filasValidas = filasImportar
    .filter((f) => f.valido)
    .map((f) => ({
      dni: f.dni, nombres: f.nombres, apellidos: f.apellidos,
      grado: f.grado, seccion: f.seccion, mesa_id: f.mesa_id,
    }));

  if (!filasValidas.length) return;

  const { error } = await supabaseClient
    .from("estudiantes")
    .upsert(filasValidas, { onConflict: "dni", count: "exact" });

  if (error) {
    Swal.fire("Error al importar", error.message, "error");
    return;
  }

  modalImportar.hide();
  Swal.fire({
    icon: "success",
    title: "Importación completada",
    text: `${filasValidas.length} estudiante(s) importados o actualizados (por DNI).`,
    timer: 2200,
    showConfirmButton: false,
  });
  cargarEstudiantes();
}
window.confirmarImportacion = confirmarImportacion;

document.getElementById("modalImportar").addEventListener("hidden.bs.modal", () => {
  setFilasImportar([]);
  document.getElementById("archivoExcel").value = "";
  document.getElementById("mensajeImportar").innerHTML = "";
  document.getElementById("importarPasoArchivo").classList.remove("d-none");
  document.getElementById("importarPasoPreview").classList.add("d-none");
  document.getElementById("btnConfirmarImportacion").classList.add("d-none");
});
