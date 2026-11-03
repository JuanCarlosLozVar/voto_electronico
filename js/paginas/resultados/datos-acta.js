// =====================================================================
// DATOS PARA LOS PDFs DE ACTAS/RESULTADOS — resultados.html
// =====================================================================
// cargarInsigniaComoDataURL() : convierte la insignia del colegio (URL
//   pública del bucket "media" o una URL externa) a un dataURL base64
//   para poder incrustarla con doc.addImage(). Si falla (sin insignia
//   configurada, CORS, etc.) devuelve null y el PDF se genera igual,
//   sin el logo.
//
// obtenerDatosActa() : trae todo lo que necesitan los dos PDFs: datos
//   del colegio, de la elección, mesas (con conteo de electores y
//   votantes), listas y miembros de mesa (para completar las firmas).
//
// Depende de: supabaseClient, estado.js (eleccionSeleccionadaId).
// Usado por: pdf-actas.js, pdf-finales.js.
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { eleccionSeleccionadaId } from "./estado.js";

export async function cargarInsigniaComoDataURL(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    const formato = /image\/png/i.test(dataUrl) ? "PNG" : "JPEG";
    return { dataUrl, formato };
  } catch (e) {
    console.error("No se pudo cargar la insignia para el PDF:", e);
    return null;
  }
}

export async function obtenerDatosActa() {
  const idEleccion = eleccionSeleccionadaId;

  const [
    { data: colegio },
    { data: eleccion },
    { data: mesas },
    { data: estudiantes },
    { data: votantes },
    { data: miembros },
    { data: listas },
    { data: votosBlanco },
  ] = await Promise.all([
    supabaseClient.from("colegio").select("*").eq("id", 1).maybeSingle(),
    idEleccion
      ? supabaseClient
          .from("eleccion")
          .select("*")
          .eq("id", idEleccion)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseClient.from("mesas").select("*").order("numero"),
    // El padrón (con su mesa asignada) es el actual — si estás viendo el
    // acta de una elección de un año anterior y ya reorganizaste mesas o
    // el padrón, este conteo reflejará la asignación de HOY, no la de
    // entonces. Para el año que acabas de cerrar es exacto.
    supabaseClient.from("estudiantes").select("id, mesa_id"),
    idEleccion
      ? supabaseClient
          .from("votantes")
          .select("estudiante_id")
          .eq("eleccion_id", idEleccion)
      : Promise.resolve({ data: [] }),
    supabaseClient
      .from("miembros_mesa")
      .select("*, estudiantes(nombres, apellidos, dni)"),
    idEleccion
      ? supabaseClient
          .from("listas")
          .select("*")
          .eq("eleccion_id", idEleccion)
          .order("numero")
      : Promise.resolve({ data: [] }),
    idEleccion
      ? supabaseClient
          .from("votos")
          .select("mesa_id")
          .eq("es_blanco", true)
          .eq("eleccion_id", idEleccion)
      : Promise.resolve({ data: [] }),
  ]);

  const mesaPorEstudiante = {};
  (estudiantes || []).forEach((e) => {
    mesaPorEstudiante[e.id] = e.mesa_id;
  });

  const conteoPadron = {},
    conteoVotantes = {};
  (estudiantes || []).forEach((e) => {
    if (!e.mesa_id) return;
    conteoPadron[e.mesa_id] = (conteoPadron[e.mesa_id] || 0) + 1;
  });
  (votantes || []).forEach((v) => {
    const mesaId = mesaPorEstudiante[v.estudiante_id];
    if (!mesaId) return;
    conteoVotantes[mesaId] = (conteoVotantes[mesaId] || 0) + 1;
  });

  const blancoPorMesa = {};
  (votosBlanco || []).forEach((v) => {
    blancoPorMesa[v.mesa_id] = (blancoPorMesa[v.mesa_id] || 0) + 1;
  });

  const miembrosPorMesa = {};
  (miembros || []).forEach((mm) => {
    miembrosPorMesa[mm.mesa_id] = miembrosPorMesa[mm.mesa_id] || {};
    miembrosPorMesa[mm.mesa_id][mm.cargo] = mm.estudiantes
      ? `${mm.estudiantes.nombres} ${mm.estudiantes.apellidos}`
      : "";
    miembrosPorMesa[mm.mesa_id][mm.cargo + "_dni"] = mm.estudiantes?.dni || "";
  });

  return {
    colegio: colegio || {},
    eleccion: eleccion || {},
    mesas: mesas || [],
    listas: listas || [],
    conteoPadron,
    conteoVotantes,
    miembrosPorMesa,
    blancoPorMesa,
  };
}
