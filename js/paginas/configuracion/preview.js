// =====================================================================
// PREVIEW DE LA INSIGNIA — configuracion.html
// =====================================================================
// Función de presentación pura: muestra u oculta la imagen de
// vista previa de la insignia del colegio según haya (o no) una URL.
//
// Usado por: colegio-form.js (al cargar los datos guardados),
// insignia-form.js (al elegir un archivo nuevo o al guardar).
// =====================================================================

export function mostrarPreview(url) {
  const img = document.getElementById("previewInsignia");
  const vacia = document.getElementById("previewVacia");
  if (url) {
    img.src = url;
    img.classList.remove("d-none");
    vacia.classList.add("d-none");
  } else {
    img.classList.add("d-none");
    vacia.classList.remove("d-none");
  }
}
