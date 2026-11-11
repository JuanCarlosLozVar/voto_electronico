// =====================================================================
// RELACIÓN DE ELECTORES POR MESA (PDF) — padron.html
// =====================================================================
// Genera la lista que se PEGA AFUERA DEL AULA de cada mesa (como la
// "Relación de electores" de la ONPE): N° de orden, apellidos y
// nombres, y DNI. El N° sale del orden del padrón dentro de la mesa y
// es el mismo que lleva la "Lista de electores" de firmas.
//
// Depende de: estado.js, mesas-datos.js, supabaseClient,
// cargarInsigniaComoDataURL (resultados/datos-acta.js),
// relacion-electores-dibujo.js. jsPDF es global (window.jspdf).
//
// generarRelacionElectores se expone en window porque el botón del
// HTML lo llama con onclick="generarRelacionElectores()".
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { estudiantesCache, mesasCache } from "./estado.js";
import { agruparPorMesa, elegirMesas } from "./mesas-datos.js";
import { cargarInsigniaComoDataURL } from "../resultados/datos-acta.js";
import { construirRelacionElectoresPdf } from "./relacion-electores-dibujo.js";

export async function generarRelacionElectores() {
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

  const gruposElegidos = await elegirMesas(gruposTodos, "Relación de electores (para pegar)", "Generar PDF");
  if (!gruposElegidos || !gruposElegidos.length) return;

  const btn = document.getElementById("btnRelacionElectores");
  const textoOriginal = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generando...";
  }

  try {
    const [{ data: colegio }, { data: eleccionData }] = await Promise.all([
      supabaseClient.from("colegio").select("*").eq("id", 1).maybeSingle(),
      supabaseClient.from("eleccion").select("nombre, fecha").order("id", { ascending: false }).limit(1),
    ]);
    const eleccion = eleccionData && eleccionData.length ? eleccionData[0] : {};
    const insignia = await cargarInsigniaComoDataURL(colegio?.insignia_url);

    const { jsPDF } = window.jspdf;
    const doc = construirRelacionElectoresPdf(jsPDF, {
      colegio: colegio || {},
      eleccion,
      insignia,
      grupos: gruposElegidos,
    });

    const anio = (eleccion.fecha || "").slice(0, 4) || new Date().getFullYear();
    const nombreArchivo =
      gruposElegidos.length === 1
        ? `relacion_electores_mesa_${String(gruposElegidos[0].mesa.numero).padStart(2, "0")}_${anio}.pdf`
        : `relacion_electores_${anio}.pdf`;
    doc.save(nombreArchivo);

    const sinMesa = estudiantesCache.filter((e) => !e.mesa_id).length;
    if (sinMesa > 0) {
      Swal.fire(
        "Relación generada",
        `${sinMesa} estudiante(s) no tienen mesa asignada y no aparecen en ninguna relación.`,
        "info",
      );
    }
  } catch (err) {
    console.error("Error al generar la relación de electores:", err);
    Swal.fire("Error", "No se pudo generar el PDF: " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  }
}
window.generarRelacionElectores = generarRelacionElectores;
