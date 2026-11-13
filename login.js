(function () {
  var client = window.hlSupabase;
  var form = document.getElementById("authForm");
  var nameField = document.getElementById("nameField");
  var nameInput = document.getElementById("fullName");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var submitButton = document.getElementById("submitButton");
  var status = document.getElementById("authStatus");
  var resendButton = document.getElementById("resendVerification");
  var mode = "login";
  var pendingEmail = "";

  function message(text, kind) {
    status.textContent = text || "";
    status.dataset.kind = kind || "info";
  }

  function setMode(nextMode) {
    mode = nextMode;
    var isSignup = mode === "signup";
    nameField.hidden = !isSignup;
    nameInput.required = isSignup;
    passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
    passwordInput.minLength = isSignup ? 8 : 1;
    document.getElementById("loginTab").setAttribute("aria-pressed", isSignup ? "false" : "true");
    document.getElementById("signupTab").setAttribute("aria-pressed", isSignup ? "true" : "false");
    document.getElementById("authTitle").textContent = isSignup ? "Crea tu cuenta" : "Inicia sesión";
    document.getElementById("authIntro").textContent = isSignup
      ? "Regístrate para acceder a tu espacio de Horizonte Laboral."
      : "Ingresa a tu espacio seguro de Horizonte Laboral.";
    submitButton.textContent = isSignup ? "Crear cuenta de usuario" : "Entrar a mi cuenta";
    if (!client) message("Falta conectar Supabase. Sigue los pasos de configuración de LEEME.txt.", "error");
    else message("", "info");
  }

  async function openAccount(user) {
    var result = await client.from("profiles").select("role").eq("id", user.id).single();
    if (result.error || !result.data) {
      throw new Error("No pudimos verificar tu perfil. Comprueba que ejecutaste supabase.sql y que la tabla profiles tiene las políticas RLS.");
    }
    window.location.assign("cuenta.html");
  }

  document.getElementById("loginTab").addEventListener("click", function () { setMode("login"); });
  document.getElementById("signupTab").addEventListener("click", function () { setMode("signup"); });

  document.getElementById("resetButton").addEventListener("click", async function () {
    if (!client) return message("Configura la URL y la clave pública de Supabase en supabase-config.js para activar el acceso.", "error");
    var email = emailInput.value.trim();
    if (!email) {
      emailInput.focus();
      return message("Escribe tu correo y luego elige «Olvidé mi contraseña».", "info");
    }
    message("Enviando el enlace de recuperación…", "info");
    var redirectTo = new URL("actualizar-password.html", window.location.href).href;
    var result = await client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo });
    if (result.error) return message(result.error.message, "error");
    message("Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.", "success");
  });

  resendButton.addEventListener("click", async function () {
    if (!client) return message("Configura Supabase antes de solicitar un correo de verificación.", "error");
    var email = pendingEmail || emailInput.value.trim().toLowerCase();
    if (!email) return message("Escribe el correo de la cuenta que quieres verificar.", "info");
    resendButton.disabled = true;
    message("Enviando el correo de verificación…", "info");
    try {
      var result = await client.auth.resend({ type: "signup", email: email });
      if (result.error) throw result.error;
      message("Si la cuenta está pendiente de verificación, enviaremos un nuevo enlace. Revisa también la carpeta de spam.", "success");
    } catch (error) {
      message(error && error.message ? error.message : "No pudimos reenviar el correo. Inténtalo nuevamente.", "error");
    } finally {
      resendButton.disabled = false;
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!client) return message("Falta conectar Supabase. Sigue los pasos de configuración de LEEME.txt.", "error");
    submitButton.disabled = true;
    submitButton.textContent = mode === "signup" ? "Creando cuenta…" : "Verificando…";
    message("", "info");
    try {
      var email = emailInput.value.trim().toLowerCase();
      var password = passwordInput.value;
      if (mode === "signup") {
        var signup = await client.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { full_name: nameInput.value.trim() },
            emailRedirectTo: new URL("cuenta.html", window.location.href).href
          }
        });
        if (signup.error) throw signup.error;
        if (signup.data.session && signup.data.user) {
          await client.auth.signOut();
          pendingEmail = email;
          setMode("login");
          resendButton.hidden = true;
          message("Supabase creó la cuenta sin pedir verificación. Activa «Confirm email» en Authentication > Sign In / Providers > Email para que el correo de verificación sea obligatorio.", "error");
        } else {
          if (!signup.data.user) throw new Error("No pudimos crear la cuenta. Inténtalo nuevamente.");
          pendingEmail = email;
          form.reset();
          setMode("login");
          emailInput.value = email;
          resendButton.hidden = false;
          message("Cuenta creada. Te enviamos un correo de verificación. Abre el enlace del mensaje antes de iniciar sesión y revisa spam si no lo ves.", "success");
        }
      } else {
        var login = await client.auth.signInWithPassword({ email: email, password: password });
        if (login.error) {
          if (/email.*not.*confirm|not confirmed/i.test(login.error.message || "")) {
            pendingEmail = email;
            resendButton.hidden = false;
            message("Primero verifica tu correo. Puedes reenviar el enlace de confirmación.", "error");
            return;
          }
          throw login.error;
        }
        await openAccount(login.data.user);
      }
    } catch (error) {
      message(error && error.message ? error.message : "No pudimos completar el acceso. Inténtalo nuevamente.", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = mode === "signup" ? "Crear cuenta de usuario" : "Entrar a mi cuenta";
    }
  });

  if (!client) message("Configura la URL y la clave pública de Supabase en supabase-config.js para activar el acceso.", "error");
  else client.auth.getSession().then(function (result) {
    if (result.data.session) window.location.assign("cuenta.html");
  });
})();
