// =====================================================================
// PREVIEW DE IMÁGENES (logo de lista / foto de candidato) — listas.html
// =====================================================================
// Función genérica de UI: al elegir un archivo en un <input type=
// "file">, muestra su vista previa en el <img> indicado.
//
// Usado por: los listeners "change" de #logoArchivo y #candFotoArchivo,
// registrados aquí mismo.
// =====================================================================

function previsualizar(inputId, imgId) {
  const input = document.getElementById(inputId);
  const file = input.files[0];
  const img = document.getElementById(imgId);
  if (file) {
    img.src = URL.createObjectURL(file);
    img.classList.remove("d-none");
  }
}

document
  .getElementById("logoArchivo")
  .addEventListener("change", () =>
    previsualizar("logoArchivo", "previewLogoLista"),
  );
document
  .getElementById("candFotoArchivo")
  .addEventListener("change", () =>
    previsualizar("candFotoArchivo", "previewFotoCand"),
  );
