(function () {
  var client = window.hlSupabase;
  var form = document.getElementById("passwordForm");
  var status = document.getElementById("passwordStatus");
  var submitButton = document.getElementById("passwordSubmit");
  var authorized = false;

  function message(text, kind) {
    status.textContent = text || "";
    status.dataset.kind = kind || "info";
  }

  if (!client) {
    message("Falta conectar Supabase. Configura supabase-config.js y vuelve a abrir el enlace.", "error");
    submitButton.disabled = true;
    return;
  }

  client.auth.getSession().then(function (result) {
    authorized = !!(result.data && result.data.session);
    if (!authorized) message("Abre esta página desde el enlace de recuperación que enviamos a tu correo.", "error");
  });
  client.auth.onAuthStateChange(function (event, session) {
    if (event === "PASSWORD_RECOVERY" && session) {
      authorized = true;
      message("Elige una contraseña nueva para tu cuenta.", "info");
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!authorized) return message("Solicita un enlace nuevo desde la página de acceso.", "error");
    var password = document.getElementById("newPassword").value;
    var confirm = document.getElementById("confirmPassword").value;
    if (password !== confirm) return message("Las contraseñas no coinciden.", "error");
    submitButton.disabled = true;
    message("Actualizando contraseña…", "info");
    var result = await client.auth.updateUser({ password: password });
    if (result.error) {
      submitButton.disabled = false;
      return message(result.error.message, "error");
    }
    await client.auth.signOut();
    form.hidden = true;
    message("Contraseña actualizada. Ya puedes volver e iniciar sesión.", "success");
  });
})();
