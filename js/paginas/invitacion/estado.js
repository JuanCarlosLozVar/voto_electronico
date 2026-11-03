// =====================================================================
// ESTADO COMPARTIDO — invitacion.html
// =====================================================================
// Variables que necesitan compartir varios módulos de esta página:
// el token de la URL, el correo capturado en el paso de invitación, y
// las referencias a los elementos del DOM que varios módulos tocan.
//
// Usado por: activar.js y registro.js.
// =====================================================================

export const params = new URLSearchParams(window.location.search);
export const token = params.get("token") || "";

export const estado = document.getElementById("estadoInvitacion");
export const form = document.getElementById("formRegistro");
export const btnActivar = document.getElementById("btnActivar");

// Correo escrito por la persona invitada (se guarda aquí para que
// registro.js pueda reutilizarlo al reintentar el login).
export let invitacionEmail = "";
export function setInvitacionEmail(valor) {
  invitacionEmail = valor;
}
