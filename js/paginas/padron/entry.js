// =====================================================================
// PUNTO DE ENTRADA — padron.html
// =====================================================================
// Reemplaza a js/supabase/supabaseClient.js + js/padron.js. Este es el
// módulo más grande del proyecto en número de archivos: conecta 10
// módulos de esta misma carpeta.
// =====================================================================

import { requireAdminSession } from "../../supabase/auth.js";
import { setModalEstudiante, setModalImportar } from "./estado.js";
import { actualizarIndicadoresOrden } from "./orden.js";
import { cargarMesasSelect } from "./mesas-select.js";
import { cargarEstudiantes } from "./estudiantes-data.js";
import "./filtros.js";          // conecta buscador/filtroGrado/filtroSeccion y expone limpiarFiltros
import "./paginacion.js";       // conecta el click de paginación y el cambio de tamaño de página
import "./seleccion.js";        // conecta checkboxes y expone asignarMesaSeleccionados/eliminarSeleccionados/cancelarSeleccion
import "./grupos.js";           // conecta el modal de grupos y expone asignarGrupo
import "./estudiante-crud.js";  // conecta el formulario y expone nuevoEstudiante/editarEstudiante/eliminarEstudiante
import "./excel-exportar.js";   // expone exportarExcel
import "./pdf-padron-mesas.js";  // expone generarPadronPorMesa (PDF de lista de electores por mesa)
import "./excel-importar.js";   // conecta la importación y expone descargarPlantilla/confirmarImportacion

(async () => {
  if (!(await requireAdminSession())) return;
  setModalEstudiante(new bootstrap.Modal(document.getElementById("modalEstudiante")));
  setModalImportar(new bootstrap.Modal(document.getElementById("modalImportar")));
  actualizarIndicadoresOrden();
  await cargarMesasSelect();
  await cargarEstudiantes();

  // Auto-actualización cada 10s para reflejar quién ya votó durante la
  // jornada, sin recargar la página. Se salta el ciclo si hay un modal
  // abierto (edición o importación en curso), para no interrumpir al admin.
  setInterval(() => {
    if (document.querySelector(".modal.show")) return;
    cargarEstudiantes();
  }, 10000);
})();
