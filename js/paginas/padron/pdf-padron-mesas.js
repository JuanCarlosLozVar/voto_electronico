// =====================================================================
// PADRÓN DE VOTANTES POR MESA (PDF) — padron.html
// =====================================================================
// Genera la "Lista de electores" de cada mesa de sufragio: una o más
// hojas por mesa con los alumnos asignados (ordenados por apellidos),
// con casillas NO VOTÓ / FIRMA / HUELLA y líneas de firma de los
// miembros de mesa en la última hoja.
//
// Al pulsar el botón se pregunta si se quiere el PDF de todas las
// mesas o solo de una (útil para reimprimir una sola lista).
// Los alumnos sin mesa asignada no aparecen en ninguna hoja; se avisa
// cuántos son al terminar.
//
// Depende de: estado.js (estudiantesCache, mesasCache), supabaseClient,
// cargarInsigniaComoDataURL (resultados/datos-acta.js),
// padron-pdf-dibujo.js. jsPDF se carga como <script> global en
// padron.html (window.jspdf).
//
// generarPadronPorMesa se expone en window porque el botón del HTML lo
// llama con onclick="generarPadronPorMesa()".
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { estudiantesCache, mesasCache } from "./estado.js";
import { agruparPorMesa, elegirMesas } from "./mesas-datos.js";
import { cargarInsigniaComoDataURL } from "../resultados/datos-acta.js";
import { construirPadronPdf } from "./padron-pdf-dibujo.js";

export async function generarPadronPorMesa() {
  if (!window.jspdf) {
    Swal.fire("No se pudo cargar jsPDF", "Revisa tu conexión a internet y recarga la página.", "error");
    return;
  }
  if (!estudiantesCache.length || !mesasCache.length) {
    Swal.fire("Sin datos", "Aún no hay estudiantes o mesas cargados en el padrón.", "info");
    return;
  }

  const gruposTodos = agruparPorMesa();
  if (!gruposTodos.length) {
    Swal.fire(
      "Sin mesas asignadas",
      "Ningún estudiante tiene mesa asignada todavía. Usa \"Asignar mesas por grupo\" primero.",
      "warning",
    );
    return;
  }

  const gruposElegidos = await elegirMesas(gruposTodos, "Padrón de votantes por mesa", "Generar PDF");
  if (!gruposElegidos || !gruposElegidos.length) return;

  const btn = document.getElementById("btnPadronPorMesa");
  const textoOriginal = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generando...";
  }

  try {
    const [{ data: colegio }, { data: eleccionData }] = await Promise.all([
      supabaseClient.from("colegio").select("*").eq("id", 1).maybeSingle(),
      supabaseClient
        .from("eleccion")
        .select("nombre, fecha")
        .order("id", { ascending: false })
        .limit(1),
    ]);
    const eleccion = eleccionData && eleccionData.length ? eleccionData[0] : {};
    const insignia = await cargarInsigniaComoDataURL(colegio?.insignia_url);

    const { jsPDF } = window.jspdf;
    const doc = construirPadronPdf(jsPDF, {
      colegio: colegio || {},
      eleccion,
      insignia,
      grupos: gruposElegidos,
    });

    const anio = (eleccion.fecha || "").slice(0, 4) || new Date().getFullYear();
    const nombreArchivo =
      gruposElegidos.length === 1
        ? `padron_mesa_${String(gruposElegidos[0].mesa.numero).padStart(2, "0")}_${anio}.pdf`
        : `padron_por_mesa_${anio}.pdf`;
    doc.save(nombreArchivo);

    const sinMesa = estudiantesCache.filter((e) => !e.mesa_id).length;
    if (sinMesa > 0) {
      Swal.fire(
        "Padrón generado",
        `${sinMesa} estudiante(s) no tienen mesa asignada y no aparecen en ninguna lista.`,
        "info",
      );
    }
  } catch (err) {
    console.error("Error al generar el padrón por mesa:", err);
    Swal.fire("Error", "No se pudo generar el PDF: " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  }
}
window.generarPadronPorMesa = generarPadronPorMesa;
