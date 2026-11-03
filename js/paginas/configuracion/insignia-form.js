// =====================================================================
// SUBIDA DE LA INSIGNIA — configuracion.html
// =====================================================================
// Maneja el <input type="file"> de la insignia (preview inmediato al
// elegir archivo) y el botón "Guardar insignia" (sube la imagen al
// storage y actualiza la fila de "colegio").
//
// Depende de: supabaseClient, subirImagen (storage.js), mostrarPreview
// (preview.js).
//
// Usado por: entry.js (solo se importa; los listeners quedan armados
// al cargar el módulo).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { subirImagen } from "../../supabase/storage.js";
import { mostrarPreview } from "./preview.js";

document.getElementById("archivoInsignia").addEventListener("change", () => {
  const file = document.getElementById("archivoInsignia").files[0];
  if (file) mostrarPreview(URL.createObjectURL(file));
});

document
  .getElementById("btnGuardarInsignia")
  .addEventListener("click", async () => {
    const estado = document.getElementById("estadoSubida");
    const file = document.getElementById("archivoInsignia").files[0];
    let url = document.getElementById("insigniaUrl").value.trim() || null;

    if (file) {
      estado.textContent = "Subiendo imagen...";
      const res = await subirImagen(file, "insignias");
      if (res?.error) {
        estado.textContent = "";
        Swal.fire("Error al subir la imagen", res.error.message, "error");
        return;
      }
      url = res.url;
      document.getElementById("insigniaUrl").value = url;
    }

    const { error } = await supabaseClient.from("colegio").upsert({
      id: 1,
      insignia_url: url,
      updated_at: new Date().toISOString(),
    });

    estado.textContent = "";
    if (error) {
      Swal.fire("Error", error.message, "error");
      return;
    }

    mostrarPreview(url);
    Swal.fire({
      icon: "success",
      title: "Insignia actualizada",
      timer: 1200,
      showConfirmButton: false,
    });
  });
