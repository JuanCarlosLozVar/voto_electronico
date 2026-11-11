// =====================================================================
// DATOS COMPARTIDOS DE MESAS — padron.html
// =====================================================================
// Un solo lugar donde se define EL ORDEN del padrón dentro de cada mesa
// (apellidos, luego nombres). Lo usan los dos PDF:
//   - pdf-padron-mesas.js       -> "Lista de electores" (firma/huella)
//   - pdf-relacion-electores.js -> "Relación de electores" (se pega afuera
//                                   del aula)
// Como ambos usan esta misma función, el N° de orden de un elector es
// SIEMPRE el mismo en las dos listas.
// =====================================================================

import { estudiantesCache, mesasCache } from "./estado.js";

export function ordenarPorApellidos(a, b) {
  return (
    a.apellidos.localeCompare(b.apellidos, "es") ||
    a.nombres.localeCompare(b.nombres, "es")
  );
}

// Agrupa el padrón por mesa. Devuelve solo las mesas que tienen alumnos.
export function agruparPorMesa() {
  return mesasCache
    .map((mesa) => ({
      mesa,
      estudiantes: estudiantesCache
        .filter((e) => e.mesa_id === mesa.id)
        .sort(ordenarPorApellidos),
    }))
    .filter((g) => g.estudiantes.length > 0);
}

// Diálogo para elegir "todas las mesas" o una sola.
export async function elegirMesas(grupos, titulo, textoBoton) {
  const opciones = { todas: `Todas las mesas (${grupos.length})` };
  grupos.forEach((g) => {
    const num = String(g.mesa.numero).padStart(2, "0");
    opciones[g.mesa.id] = `Mesa ${num} — ${g.estudiantes.length} electores`;
  });

  const { isConfirmed, value } = await Swal.fire({
    title: titulo,
    text: "¿De qué mesas quieres generar la lista?",
    input: "select",
    inputOptions: opciones,
    inputValue: "todas",
    showCancelButton: true,
    confirmButtonText: textoBoton,
    cancelButtonText: "Cancelar",
  });
  if (!isConfirmed) return null;
  if (value === "todas") return grupos;
  return grupos.filter((g) => String(g.mesa.id) === String(value));
}
