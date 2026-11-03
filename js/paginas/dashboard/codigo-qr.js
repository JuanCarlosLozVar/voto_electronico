// =====================================================================
// CÓDIGO QR DE VOTACIÓN — dashboard.html
// =====================================================================
// Genera el código QR con la URL directa a votar.html (para que el
// comité electoral lo pegue en un cartel o lo proyecte) y conecta el
// botón "Copiar URL".
//
// Depende de: window.QRCode, cargado como <script> global en
// dashboard.html (librería qrcodejs, no es un módulo ES).
//
// Usado por: entry.js.
// =====================================================================

export function generarCodigoQr() {
  const urlVotar = new URL("votar.html", window.location.href).toString();
  document.getElementById("urlVotar").value = urlVotar;
  try {
    new QRCode(document.getElementById("qrVotar"), {
      text: urlVotar,
      width: 160,
      height: 160,
      colorDark: "#16233f",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (e) {
    console.error("No se pudo generar el código QR:", e);
    document.getElementById("qrVotar").textContent = "No se pudo generar el código QR.";
  }

  document.getElementById("btnCopiarUrl").addEventListener("click", () => {
    const input = document.getElementById("urlVotar");
    input.select();
    navigator.clipboard?.writeText(input.value);
  });
}
