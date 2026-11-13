(function () {
  var client = window.hlSupabase;
  var loading = document.getElementById("accountLoading");
  var content = document.getElementById("accountContent");
  var status = document.getElementById("accountStatus");

  function showError(text) {
    loading.textContent = text;
    loading.dataset.kind = "error";
  }

  async function start() {
    if (!client) return showError("Falta conectar Supabase. Configura supabase-config.js y sigue LEEME.txt.");
    var auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) {
      window.location.replace("login.html");
      return;
    }
    var result = await client.from("profiles").select("full_name,role").eq("id", auth.data.user.id).single();
    if (result.error || !result.data) {
      return showError("No pudimos cargar tu perfil. Comprueba la configuración de la tabla profiles y sus políticas RLS.");
    }

    var profile = result.data;
    var name = profile.full_name || auth.data.user.email || "Usuario";
    document.getElementById("accountName").textContent = name;
    document.getElementById("accountEmail").textContent = auth.data.user.email || "";
    if (profile.role === "admin") {
      document.getElementById("accountRole").textContent = "ADMINISTRADOR";
      document.getElementById("adminContent").hidden = false;
    } else {
      document.getElementById("accountRole").textContent = "USUARIO";
      document.getElementById("userContent").hidden = false;
    }
    loading.hidden = true;
    content.hidden = false;
  }

  document.getElementById("logoutButton").addEventListener("click", async function () {
    if (client) await client.auth.signOut();
    window.location.replace("login.html");
  });

  if (client) {
    client.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_OUT" || !session) window.location.replace("login.html");
    });
  }
  start().catch(function () { showError("No pudimos cargar la cuenta. Recarga la página e inténtalo nuevamente."); });
})();
