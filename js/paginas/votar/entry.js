// =====================================================================
// PUNTO DE ENTRADA — votar.html
// =====================================================================
// Reemplaza a js/supabase/supabaseClient.js + js/votar.js.
// No requiere sesión: esta pantalla es pública (la usan los
// estudiantes desde cualquier dispositivo).
// =====================================================================

import { cargarColegioPublico } from "../../supabase/colegio.js";
import { cargarEleccionPublica } from "./eleccion-publica.js";
import "./flujo.js";          // conecta el botón "Salir del sistema"
import "./paso-dni.js";       // conecta el formulario del DNI y "No soy yo"
import "./paso-boleta.js";    // conecta "Continuar" y expone seleccionarLista
import "./paso-confirmar.js"; // conecta "Ir a confirmar" y "Cambiar mi voto"
import "./paso-voto.js";      // conecta "Confirmar voto"

cargarEleccionPublica();
cargarColegioPublico();
