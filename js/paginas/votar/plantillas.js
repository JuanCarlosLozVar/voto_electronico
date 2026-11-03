// =====================================================================
// FUNCIONES DE PRESENTACIÓN (sin llamadas a Supabase) — votar.html
// =====================================================================
// mostrarPaso        : muestra un paso del flujo y oculta los demás.
// iniciales          : "JU" a partir de nombres/apellidos, para el
//                       avatar cuando no hay foto.
// avatarHtml          : <div> con foto del candidato, o iniciales si
//                       no tiene foto.
// candidatoPrincipal : elige el candidato "cabeza de lista" (alcalde,
//                       sin ser teniente alcalde) para mostrarlo
//                       destacado en la tarjeta de cada lista.
// badgeAlumnoHtml     : tarjeta con los datos del estudiante (nombre,
//                       grado, sección, mesa), reutilizada en el paso
//                       de boleta y en el de confirmación.
//
// Usado por: eleccion-publica.js, paso-boleta.js, paso-confirmar.js.
// =====================================================================

import { escapeHtml } from "../../utils/html.js";

export function mostrarPaso(id) {
  ["pasoDni", "pasoDatos", "pasoBoleta", "pasoConfirmar", "pasoExito"].forEach(
    (p) => {
      document.getElementById(p).classList.toggle("d-none", p !== id);
    },
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function iniciales(nombres, apellidos) {
  return escapeHtml(
    `${(nombres || "?").charAt(0)}${(apellidos || "").charAt(0)}`.toUpperCase(),
  );
}

export function avatarHtml(candidato, clase = "") {
  if (candidato && candidato.foto_url) {
    return `<div class="avatar-candidato ${clase}"><img src="${candidato.foto_url}" alt=""></div>`;
  }
  const ini = candidato
    ? iniciales(candidato.nombres, candidato.apellidos)
    : "?";
  return `<div class="avatar-candidato ${clase}">${ini}</div>`;
}

// Candidato "cabeza de lista": el primero cuyo cargo contenga "alcalde"
// pero no "teniente"; si no hay ninguno, se usa el primer candidato.
export function candidatoPrincipal(candidatos) {
  if (!candidatos || !candidatos.length) return null;
  const principal = candidatos.find(
    (c) =>
      c.cargo &&
      c.cargo.toLowerCase().includes("alcalde") &&
      !c.cargo.toLowerCase().includes("teniente"),
  );
  return principal || candidatos[0];
}

export function badgeAlumnoHtml(est) {
  return `
    <strong>${escapeHtml(est.nombres)} ${escapeHtml(est.apellidos)}</strong>
    <div class="small text-muted">Grado: ${escapeHtml(est.grado)}</div>
    <div class="small text-muted">Sección: ${escapeHtml(est.seccion)}</div>
    <div class="small text-muted">Mesa: ${escapeHtml(est.mesa_nombre)}</div>
  `;
}
