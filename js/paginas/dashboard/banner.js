// =====================================================================
// BANNER "VOTACIÓN ABIERTA" + CONTADOR — dashboard.html
// =====================================================================
// Muestra/oculta el banner de votación abierta y corre el contador
// regresivo hasta la hora de cierre. También reconsulta el estado de
// la elección cada 10s (refrescarEstadoEleccion) para que el banner
// se mantenga correcto aunque la votación se abra/cierre desde otra
// pestaña o dispositivo.
//
// Depende de: supabaseClient.
//
// Usado por: estadisticas.js (llama actualizarBannerVotacion con los
// datos ya cargados) y entry.js (arranca el setInterval).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";

let intervaloBannerContador = null;

export function actualizarBannerVotacion(el) {
  const banner = document.getElementById("bannerVotacionAbierta");
  clearInterval(intervaloBannerContador);

  if (!el || el.estado !== "abierta" || !el.fecha || !el.hora_fin) {
    banner.classList.add("d-none");
    banner.classList.remove("d-flex");
    return;
  }

  banner.classList.remove("d-none");
  banner.classList.add("d-flex");

  // Si hora_fin es igual o anterior a hora_inicio, se asume que el cierre
  // es al día siguiente (ej. abre 20:16, cierra 12:00 del día después).
  const objetivo = new Date(`${el.fecha}T${el.hora_fin}`);
  if (el.hora_inicio && el.hora_fin <= el.hora_inicio) {
    objetivo.setDate(objetivo.getDate() + 1);
  }
  const contador = document.getElementById("bannerContador");

  const tick = () => {
    const diff = objetivo.getTime() - Date.now();
    if (diff <= 0) {
      contador.textContent = "00:00:00";
      clearInterval(intervaloBannerContador);
      return;
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    contador.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  tick();
  intervaloBannerContador = setInterval(tick, 1000);
}

export async function refrescarEstadoEleccion() {
  const { data: eleccion } = await supabaseClient
    .from("eleccion")
    .select("*")
    .order("id", { ascending: false })
    .limit(1);

  const el = eleccion && eleccion.length ? eleccion[0] : null;

  if (el) {
    document.getElementById("eleccionNombre").textContent = el.nombre;
    document.getElementById("eleccionFecha").textContent =
      `${el.fecha} · ${el.hora_inicio.slice(0, 5)} a ${el.hora_fin.slice(0, 5)}`;
    const badge = document.getElementById("eleccionEstado");
    badge.className = "badge rounded-pill px-3 py-2";
    const estados = {
      configuracion: ["En configuración", "badge-pendiente"],
      abierta: ["Votación abierta", "badge-abierta"],
      cerrada: ["Votación cerrada", "badge-cerrada"],
    };
    const [texto, clase] = estados[el.estado] || ["–", "badge-pendiente"];
    badge.textContent = texto;
    badge.classList.add(clase);
  }

  actualizarBannerVotacion(el);
}
