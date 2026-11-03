// =====================================================================
// DATOS BÁSICOS DEL COLEGIO — configuracion.html
// =====================================================================
// Carga los datos guardados (nombre, código IE, distrito, lema,
// insignia) en el formulario, y guarda los cambios del formulario
// "formColegio" (todo excepto la insignia, que se maneja aparte en
// insignia-form.js porque implica subir un archivo).
//
// Depende de: supabaseClient, mostrarPreview (preview.js).
//
// Usado por: entry.js (llama a cargarColegio() al iniciar la página).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { mostrarPreview } from "./preview.js";

export async function cargarColegio() {
  const { data, error } = await supabaseClient
    .from("colegio")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return;

  document.getElementById("nombre").value = data.nombre || "";
  document.getElementById("ieCodigo").value = data.ie_codigo || "";
  document.getElementById("distrito").value = data.distrito || "";
  document.getElementById("lema").value = data.lema || "";
  document.getElementById("insigniaUrl").value = data.insignia_url || "";
  mostrarPreview(data.insignia_url);
}

document.getElementById("formColegio").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    id: 1,
    nombre: document.getElementById("nombre").value.trim(),
    ie_codigo: document.getElementById("ieCodigo").value.trim() || null,
    distrito: document.getElementById("distrito").value.trim() || null,
    lema: document.getElementById("lema").value.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient.from("colegio").upsert(payload);
  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }
  Swal.fire({
    icon: "success",
    title: "Datos guardados",
    timer: 1200,
    showConfirmButton: false,
  });
});
