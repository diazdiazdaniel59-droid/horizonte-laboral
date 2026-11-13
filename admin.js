(function () {
  var client = window.hlSupabase;
  var loading = document.getElementById("adminLoading");
  var panel = document.getElementById("adminPanel");
  var currentUser = null;
  var services = [];
  var plans = [];
  var accounts = [];

  function setStatus(id, text, kind) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || "";
    el.dataset.kind = kind || "info";
  }

  function failLoading(text) {
    loading.textContent = text;
    loading.dataset.kind = "error";
  }

  function cell(text) {
    var td = document.createElement("td");
    td.textContent = text == null ? "" : String(text);
    return td;
  }

  function moneyInput(value, label) {
    var input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "100";
    input.value = Number(value) || 0;
    input.className = "admin-number";
    input.setAttribute("aria-label", label);
    return input;
  }

  function checkbox(checked, label) {
    var input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!checked;
    input.setAttribute("aria-label", label);
    return input;
  }

  function saveButton(label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "admin-save";
    button.textContent = label || "Guardar";
    return button;
  }

  function renderServices() {
    var tbody = document.getElementById("servicesRows");
    tbody.replaceChildren();
    services.forEach(function (service) {
      var row = document.createElement("tr");
      row.appendChild(cell(service.name));
      row.appendChild(cell(service.category));
      var priceCell = document.createElement("td");
      var price = moneyInput(service.price_cop, "Precio COP para " + service.name);
      priceCell.appendChild(price);
      row.appendChild(priceCell);
      var activeCell = document.createElement("td");
      var active = checkbox(service.active, "Servicio activo: " + service.name);
      activeCell.appendChild(active);
      row.appendChild(activeCell);
      var actionCell = document.createElement("td");
      var save = saveButton();
      save.addEventListener("click", async function () {
        var amount = Number(price.value);
        if (!Number.isInteger(amount) || amount < 0) return setStatus("servicesStatus", "Ingresa un precio entero no negativo.", "error");
        save.disabled = true;
        setStatus("servicesStatus", "Guardando servicio…", "info");
        var result = await client.from("services").update({ price_cop: amount, active: active.checked, updated_at: new Date().toISOString(), updated_by: currentUser.id }).eq("id", service.id);
        save.disabled = false;
        if (result.error) return setStatus("servicesStatus", result.error.message, "error");
        service.price_cop = amount;
        service.active = active.checked;
        setStatus("servicesStatus", "Servicio actualizado. El cambio ya está disponible en el sitio público.", "success");
      });
      actionCell.appendChild(save);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });
    document.getElementById("serviceCount").textContent = String(services.filter(function (item) { return item.active; }).length);
  }

  function renderPlans() {
    var tbody = document.getElementById("plansRows");
    tbody.replaceChildren();
    plans.forEach(function (plan) {
      var row = document.createElement("tr");
      row.appendChild(cell(plan.name));
      var referenceCell = document.createElement("td");
      var reference = moneyInput(plan.reference_price_cop, "Precio de referencia de " + plan.name);
      referenceCell.appendChild(reference);
      row.appendChild(referenceCell);
      var promoCell = document.createElement("td");
      var promo = moneyInput(plan.promo_price_cop, "Precio promocional de " + plan.name);
      promoCell.appendChild(promo);
      row.appendChild(promoCell);
      var featuredCell = document.createElement("td");
      var featured = checkbox(plan.featured, "Destacar " + plan.name);
      featuredCell.appendChild(featured);
      row.appendChild(featuredCell);
      var activeCell = document.createElement("td");
      var active = checkbox(plan.active, "Plan activo: " + plan.name);
      activeCell.appendChild(active);
      row.appendChild(activeCell);
      var actionCell = document.createElement("td");
      var save = saveButton();
      save.addEventListener("click", async function () {
        var regular = Number(reference.value);
        var discount = Number(promo.value);
        if (!Number.isInteger(regular) || !Number.isInteger(discount) || regular < 0 || discount < 0) return setStatus("plansStatus", "Los precios deben ser números enteros no negativos.", "error");
        save.disabled = true;
        setStatus("plansStatus", "Guardando plan…", "info");
        var result = await client.from("plans").update({ reference_price_cop: regular, promo_price_cop: discount, featured: featured.checked, active: active.checked, updated_at: new Date().toISOString(), updated_by: currentUser.id }).eq("id", plan.id);
        save.disabled = false;
        if (result.error) return setStatus("plansStatus", result.error.message, "error");
        plan.reference_price_cop = regular;
        plan.promo_price_cop = discount;
        plan.featured = featured.checked;
        plan.active = active.checked;
        setStatus("plansStatus", "Plan actualizado. El cambio ya está disponible en el sitio público.", "success");
      });
      actionCell.appendChild(save);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });
    document.getElementById("planCount").textContent = String(plans.filter(function (item) { return item.active; }).length);
  }

  function renderAccounts() {
    var tbody = document.getElementById("accountsRows");
    tbody.replaceChildren();
    accounts.forEach(function (account) {
      var row = document.createElement("tr");
      row.appendChild(cell(account.full_name || "—"));
      row.appendChild(cell(account.email || "—"));
      row.appendChild(cell(account.role === "admin" ? "Administrador" : "Usuario"));
      row.appendChild(cell(account.created_at ? new Date(account.created_at).toLocaleString("es-CO") : "—"));
      var origin = account.created_by_email ? "Creada por " + account.created_by_email : (account.creation_source || "Registro público");
      row.appendChild(cell(origin));
      var actionCell = document.createElement("td");
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "admin-delete";
      remove.textContent = "Eliminar";
      remove.disabled = account.user_id === currentUser.id;
      remove.title = remove.disabled ? "No puedes eliminar la sesión con la que estás administrando" : "Eliminar cuenta";
      remove.addEventListener("click", async function () {
        if (!window.confirm("¿Eliminar permanentemente la cuenta " + (account.email || "seleccionada") + "? Esta acción no se puede deshacer.")) return;
        remove.disabled = true;
        setStatus("accountsStatus", "Eliminando cuenta…", "info");
        var result = await client.rpc("admin_delete_account", { p_user_id: account.user_id });
        if (result.error) {
          remove.disabled = false;
          return setStatus("accountsStatus", result.error.message, "error");
        }
        accounts = accounts.filter(function (item) { return item.user_id !== account.user_id; });
        renderAccounts();
        setStatus("accountsStatus", "Cuenta eliminada.", "success");
      });
      actionCell.appendChild(remove);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });
    if (!accounts.length) {
      var empty = document.createElement("tr");
      var emptyCell = cell("Aún no hay cuentas registradas.");
      emptyCell.colSpan = 6;
      empty.appendChild(emptyCell);
      tbody.appendChild(empty);
    }
    document.getElementById("accountCount").textContent = String(accounts.length);
  }

  async function loadData() {
    setStatus("servicesStatus", "Cargando servicios…", "info");
    setStatus("plansStatus", "Cargando planes…", "info");
    setStatus("accountsStatus", "Cargando cuentas…", "info");
    var result = await Promise.all([
      client.from("services").select("id,category,name,description,price_cop,display_order,featured,active").order("display_order"),
      client.from("plans").select("id,name,phase_label,reference_price_cop,promo_price_cop,features,featured,display_order,active").order("display_order"),
      client.from("site_promotions").select("id,title,starts_on,ends_on,active").eq("id", 1).single(),
      client.rpc("admin_list_accounts")
    ]);
    if (result[0].error) setStatus("servicesStatus", "No pudimos cargar los servicios: " + result[0].error.message, "error");
    else { services = result[0].data || []; renderServices(); setStatus("servicesStatus", "", "info"); }
    if (result[1].error) setStatus("plansStatus", "No pudimos cargar los planes: " + result[1].error.message, "error");
    else { plans = result[1].data || []; renderPlans(); setStatus("plansStatus", "", "info"); }
    if (result[2].error) setStatus("promotionStatus", "No pudimos cargar la promoción: " + result[2].error.message, "error");
    else {
      document.getElementById("promoName").value = result[2].data.title || "";
      document.getElementById("promoStart").value = result[2].data.starts_on || "";
      document.getElementById("promoEnd").value = result[2].data.ends_on || "";
      document.getElementById("promoActive").checked = !!result[2].data.active;
    }
    if (result[3].error) setStatus("accountsStatus", "No pudimos cargar las cuentas: " + result[3].error.message, "error");
    else { accounts = result[3].data || []; renderAccounts(); setStatus("accountsStatus", "", "info"); }
  }

  async function start() {
    if (!client) return failLoading("No se pudo conectar con Supabase.");
    var auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) return window.location.replace("login.html");
    var profile = await client.from("profiles").select("role").eq("id", auth.data.user.id).single();
    if (profile.error || !profile.data) return failLoading("No pudimos verificar tu rol en Supabase.");
    if (profile.data.role !== "admin") return window.location.replace("cuenta.html");
    currentUser = auth.data.user;
    document.getElementById("adminEmail").textContent = currentUser.email || "";
    loading.hidden = true;
    panel.hidden = false;
    await loadData();
  }

  document.querySelectorAll(".admin-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".admin-tab").forEach(function (item) {
        var active = item === tab;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });
      document.querySelectorAll(".admin-view").forEach(function (view) { view.hidden = view.id !== "view-" + tab.dataset.view; });
    });
  });

  document.getElementById("promotionForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    var start = document.getElementById("promoStart").value;
    var end = document.getElementById("promoEnd").value;
    if (start > end) return setStatus("promotionStatus", "La fecha de inicio debe ser anterior o igual a la fecha de fin.", "error");
    setStatus("promotionStatus", "Guardando promoción…", "info");
    var result = await client.from("site_promotions").upsert({ id: 1, title: document.getElementById("promoName").value.trim(), starts_on: start, ends_on: end, active: document.getElementById("promoActive").checked, updated_at: new Date().toISOString(), updated_by: currentUser.id });
    if (result.error) return setStatus("promotionStatus", result.error.message, "error");
    setStatus("promotionStatus", "Promoción guardada y publicada.", "success");
  });

  document.getElementById("adminLogout").addEventListener("click", async function () {
    if (client) await client.auth.signOut();
    window.location.replace("login.html");
  });

  if (client) client.auth.onAuthStateChange(function (event, session) {
    if (event === "SIGNED_OUT" || !session) window.location.replace("login.html");
  });
  start().catch(function () { failLoading("No pudimos cargar el panel. Recarga e inténtalo nuevamente."); });
})();
