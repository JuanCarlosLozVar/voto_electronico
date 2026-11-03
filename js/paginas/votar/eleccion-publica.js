// =====================================================================
// ESTADO PÚBLICO DE LA ELECCIÓN + CONTADOR — votar.html
// =====================================================================
// Trae el estado de la elección (abierta/cerrada/configuración) sin
// necesidad de sesión (RPC fn_obtener_estado_eleccion_publico), pinta
// el título y arranca el contador regresivo hasta el cierre.
//
// IMPORTANTE: el estado se vuelve a consultar cada 6 segundos
// (verificarEstadoEleccion) mientras la pestaña está abierta, para que
// si el administrador cierra la votación manualmente, el estudiante lo
// vea de inmediato en vez de seguir con un contador desactualizado.
//
// Depende de: supabaseClient, estado.js, reiniciarFlujo (flujo.js).
// Usado por: entry.js (llamada inicial).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { reiniciarFlujo } from "./flujo.js";
import {
  intervaloContador, setIntervaloContador,
  intervaloRedireccion,
  intervaloEstado, setIntervaloEstado,
  eleccionEstadoActual, setEleccionEstadoActual,
  setEleccionIdActual,
} from "./estado.js";

export function iniciarContador(finAt) {
  clearInterval(intervaloContador);
  // fin_at viene de PostgreSQL y ya está calculado con America/Lima.
  const objetivo = new Date(finAt);
  document.getElementById("cajaContador").classList.remove("d-none");

  setIntervaloContador(
    setInterval(() => {
      const diff = objetivo.getTime() - Date.now();
      if (diff <= 0) {
        clearInterval(intervaloContador);
        document.getElementById("ctHoras").textContent = "00";
        document.getElementById("ctMin").textContent = "00";
        document.getElementById("ctSeg").textContent = "00";
        verificarEstadoEleccion();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      document.getElementById("ctHoras").textContent = String(h).padStart(2, "0");
      document.getElementById("ctMin").textContent = String(m).padStart(2, "0");
      document.getElementById("ctSeg").textContent = String(s).padStart(2, "0");
    }, 1000),
  );
}

export function aplicarEstadoVotacion(el, { avisarSiEstabaVotando } = {}) {
  const estabaAbierta = eleccionEstadoActual === "abierta";
  setEleccionEstadoActual(el.estado);
  setEleccionIdActual(el.id);

  const cajaContador = document.getElementById("cajaContador");
  const aviso = document.getElementById("avisoCerrada");
  const btn = document.getElementById("btnAccederVotar");
  const inputDni = document.getElementById("dni");

  if (el.estado === "abierta" && el.fecha && el.hora_fin) {
    aviso.classList.add("d-none");
    btn.disabled = false;
    inputDni.disabled = false;
    iniciarContador(el.fin_at);
  } else {
    clearInterval(intervaloContador);
    cajaContador.classList.add("d-none");
    aviso.textContent =
      el.estado === "cerrada"
        ? "La votación ha sido cerrada. Ya no se pueden registrar nuevos votos."
        : "La votación no está abierta en este momento. Consulta con tu comité electoral.";
    aviso.classList.remove("d-none");
    btn.disabled = true;
    inputDni.disabled = true;
  }

  // Si la votación se cerró justo mientras el/la estudiante estaba
  // en medio del flujo (viendo sus datos o la boleta), lo avisamos y
  // lo regresamos al inicio en vez de dejarlo "votar" sobre una
  // pantalla desactualizada.
  if (avisarSiEstabaVotando && estabaAbierta && el.estado !== "abierta") {
    const pasoActivo = ["pasoDatos", "pasoBoleta", "pasoConfirmar"].find(
      (p) => !document.getElementById(p).classList.contains("d-none"),
    );
    if (pasoActivo) {
      clearInterval(intervaloRedireccion);
      Swal.fire({
        icon: "warning",
        title: "Votación cerrada",
        text: "El comité electoral cerró la votación. Tu voto no fue registrado.",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#c8102e",
      }).then(() => reiniciarFlujo());
    }
  }
}

export async function verificarEstadoEleccion() {
  const { data, error } = await supabaseClient.rpc(
    "fn_obtener_estado_eleccion_publico",
  );
  if (!error && data?.[0])
    aplicarEstadoVotacion(data[0], { avisarSiEstabaVotando: true });
}

export async function cargarEleccionPublica() {
  const { data, error } = await supabaseClient.rpc(
    "fn_obtener_estado_eleccion_publico",
  );

  if (error) {
    // No se pudo leer el estado de la elección (típicamente porque falta
    // la política RLS "public_select_eleccion" en la tabla `eleccion` -
    // ver README, sección 9). Se avisa en pantalla en vez de dejar el
    // contador congelado en 00:00:00 sin explicación.
    document.getElementById("cajaContador").classList.add("d-none");
    const aviso = document.getElementById("avisoCerrada");
    aviso.textContent =
      "No se pudo verificar el estado de la votación. Avisa al comité electoral (error de configuración del servidor).";
    aviso.classList.remove("d-none");
    document.getElementById("btnAccederVotar").disabled = true;
    document.getElementById("dni").disabled = true;
    console.error("Error al leer 'eleccion':", error.message);
    return;
  }
  if (!data || !data.length) return; // aún no hay elección configurada: se queda con los textos por defecto

  const el = data[0];
  document.getElementById("tituloEleccion").textContent = el.nombre;
  document.getElementById("nombreEleccionPaso1").textContent = el.nombre;
  document.getElementById("nombreEleccionPaso3").textContent = el.nombre;

  aplicarEstadoVotacion(el);

  // Vuelve a consultar el estado de la elección cada 6 segundos para
  // detectar un cierre (o apertura) manual mientras la pantalla sigue
  // abierta. Usa la misma función RPC que ya calcula fin_at con la
  // zona horaria correcta — una consulta directa a la tabla "eleccion"
  // no trae ese campo y producía un contador "NaN".
  clearInterval(intervaloEstado);
  setIntervaloEstado(setInterval(verificarEstadoEleccion, 6000));
}
