// =====================================================================
// REINICIO DEL FLUJO Y REDIRECCIÓN AUTOMÁTICA — votar.html
// =====================================================================
// reiniciarFlujo()     : limpia todo y regresa al paso 1 (pantalla de
//                        DNI). Se usa tanto al terminar de votar como
//                        cuando el admin cierra la votación a mitad
//                        del flujo.
// iniciarRedireccion() : cuenta 8 segundos en el paso de éxito y luego
//                        llama a reiniciarFlujo() automáticamente.
//
// Se separan en su propio archivo (en vez de vivir en paso-voto.js o
// en eleccion-publica.js) porque AMBOS módulos necesitan llamarlas, y
// así se evita que un archivo tenga que importar al otro "en círculo".
//
// Depende de: estado.js, mostrarPaso (plantillas.js).
// Usado por: eleccion-publica.js, paso-dni.js, paso-voto.js, entry.js
// (botón "Salir del sistema").
// =====================================================================

import { mostrarPaso } from "./plantillas.js";
import {
  setDniActual, setEstudianteActual, setListaSeleccionada,
  intervaloRedireccion, setIntervaloRedireccion,
} from "./estado.js";

export function reiniciarFlujo() {
  clearInterval(intervaloRedireccion);
  setDniActual(null);
  setEstudianteActual(null);
  setListaSeleccionada(null);
  document.getElementById("dni").value = "";
  document.getElementById("mensajeDni").innerHTML = "";
  mostrarPaso("pasoDni");
}

export function iniciarRedireccion() {
  let segundos = 8;
  const texto = document.getElementById("textoRedireccion");
  texto.textContent = `Redireccionando automáticamente en ${segundos} segundos...`;
  setIntervaloRedireccion(
    setInterval(() => {
      segundos--;
      if (segundos <= 0) {
        reiniciarFlujo();
        return;
      }
      texto.textContent = `Redireccionando automáticamente en ${segundos} segundos...`;
    }, 1000),
  );
}

document.getElementById("btnSalirSistema").addEventListener("click", reiniciarFlujo);
