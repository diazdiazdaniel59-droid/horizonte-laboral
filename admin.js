(function () {
  var client = window.hlSupabase;
  var loading = document.getElementById("adminLoading");
  var panel = document.getElementById("adminPanel");
  var status = document.getElementById("adminStatus");

  function showError(text) {
    loading.textContent = text;
    loading.dataset.kind = "error";
  }

  async function start() {
    if (!client) return showError("No se pudo conectar con Supabase.");
    var auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) {
      window.location.replace("login.html");
      return;
    }
    var result = await client.from("profiles").select("full_name,role").eq("id", auth.data.user.id).single();
    if (result.error || !result.data) {
      return showError("No se pudo verificar tu perfil. Comprueba las políticas RLS de Supabase.");
    }
    if (result.data.role !== "admin") {
      window.location.replace("cuenta.html");
      return;
    }

    document.getElementById("adminName").textContent = result.data.full_name || auth.data.user.email || "Administrador";
    loading.hidden = true;
    panel.hidden = false;
  }

  document.getElementById("adminLogout").addEventListener("click", async function () {
    if (client) await client.auth.signOut();
    window.location.replace("login.html");
  });

  if (client) {
    client.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_OUT" || !session) window.location.replace("login.html");
    });
  }
  start().catch(function () { showError("No pudimos cargar el panel. Recarga e inténtalo nuevamente."); });
})();
