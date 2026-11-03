// =====================================================================
// PASO 4 → 5: Registrar el voto — votar.html
// =====================================================================
// Envía el voto al RPC fn_emitir_voto (que valida en el servidor que
// el DNI no haya votado ya y que la votación siga abierta) y muestra
// la pantalla de éxito con redirección automática.
//
// Depende de: supabaseClient, estado.js, mostrarPaso (plantillas.js),
// iniciarRedireccion (flujo.js).
// Usado por: entry.js (solo se importa).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { mostrarPaso } from "./plantillas.js";
import { iniciarRedireccion } from "./flujo.js";
import { dniActual, listaSeleccionada } from "./estado.js";

document
  .getElementById("btnConfirmarVoto")
  .addEventListener("click", async () => {
    const boton = document.getElementById("btnConfirmarVoto");
    boton.disabled = true;
    boton.textContent = "Registrando...";

    const { data, error } = await supabaseClient.rpc("fn_emitir_voto", {
      p_dni: dniActual,
      p_lista_id: listaSeleccionada === "blanco" ? null : listaSeleccionada,
    });

    boton.disabled = false;
    boton.textContent = "Confirmar voto";

    if (error) {
      Swal.fire(
        "No se pudo registrar tu voto",
        error.message.replace(/^.*: /, ""),
        "error",
      );
      return;
    }

    mostrarPaso("pasoExito");
    iniciarRedireccion();
  });
