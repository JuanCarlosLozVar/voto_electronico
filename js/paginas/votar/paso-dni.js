// =====================================================================
// PASO 1 → 2: Consulta por DNI — votar.html
// =====================================================================
// Envía el formulario del DNI, valida contra el RPC fn_consultar_estudiante
// (verifica que exista, que no haya votado ya, y que tenga mesa
// asignada) y pasa al paso "Datos del estudiante". El botón "No soy
// yo" regresa al paso 1 en blanco.
//
// Depende de: supabaseClient, escapeHtml, mostrarPaso (plantillas.js),
// estado.js.
// Usado por: entry.js (solo se importa; los listeners quedan armados).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import { mostrarPaso } from "./plantillas.js";
import { setDniActual, setEstudianteActual } from "./estado.js";

document.getElementById("formDni").addEventListener("submit", async (e) => {
  e.preventDefault();
  const dni = document.getElementById("dni").value.replace(/\s+/g, "");
  const msg = document.getElementById("mensajeDni");
  msg.innerHTML = "";

  // Validar el formato aquí evita gastar intentos del límite anti fuerza
  // bruta por un simple error de tecleo.
  if (!/^[0-9]{8}$/.test(dni)) {
    msg.innerHTML = `<div class="alert alert-danger mb-0">Ingresa un DNI válido de 8 dígitos.</div>`;
    return;
  }

  const { data, error } = await supabaseClient.rpc("fn_consultar_estudiante", {
    p_dni: dni,
  });

  if (error) {
    msg.innerHTML = `<div class="alert alert-danger mb-0">${escapeHtml(error.message.replace(/^.*: /, ""))}</div>`;
    return;
  }
  const est = Array.isArray(data) ? data[0] : data;
  if (!est) {
    msg.innerHTML = `<div class="alert alert-danger mb-0">El DNI ingresado no figura en el padrón electoral.</div>`;
    return;
  }
  if (est.ha_votado) {
    msg.innerHTML = `<div class="alert alert-warning mb-0">Este DNI ya registró su voto anteriormente.</div>`;
    return;
  }
  if (!est.mesa_id) {
    msg.innerHTML = `<div class="alert alert-danger mb-0">Tu registro no tiene una mesa asignada. Consulta con tu docente encargado.</div>`;
    return;
  }

  setDniActual(dni);
  setEstudianteActual(est);

  document.getElementById("datoNombreCompleto").textContent =
    `${est.nombres} ${est.apellidos}`;
  document.getElementById("datoGrado").textContent = est.grado;
  document.getElementById("datoSeccion").textContent = est.seccion;
  document.getElementById("datoMesa").textContent = est.mesa_nombre;

  mostrarPaso("pasoDatos");
});

document.getElementById("btnNoSoyYo").addEventListener("click", () => {
  setDniActual(null);
  setEstudianteActual(null);
  document.getElementById("dni").value = "";
  document.getElementById("mensajeDni").innerHTML = "";
  mostrarPaso("pasoDni");
});
