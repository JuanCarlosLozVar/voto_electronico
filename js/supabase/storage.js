// =====================================================================
// STORAGE PÚBLICO "media" (subida de imágenes)
// =====================================================================
// Sube un archivo al bucket público "media" de Supabase Storage y
// devuelve su URL pública. Se usa para insignias del colegio, logos de
// listas y fotos de candidatos.
//
// Depende de: js/supabase/client.js (supabaseClient).
//
// Usado por: configuracion/insignia-form.js, listas/listas-crud.js y
// listas/candidatos-crud.js.
// =====================================================================

import { supabaseClient } from "./client.js";

export async function subirImagen(file, carpeta) {
  if (!file) return null;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const ruta = `${carpeta}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabaseClient.storage.from("media").upload(ruta, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Error al subir imagen:", error.message);
    return { error };
  }

  const { data } = supabaseClient.storage.from("media").getPublicUrl(ruta);
  return { url: data.publicUrl };
}
