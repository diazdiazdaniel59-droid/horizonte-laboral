(function () {
  var client = window.hlSupabase;
  if (!client) return;

  function money(value) {
    return "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value || 0);
  }

  function formatDate(value) {
    var parts = String(value || "").split("-");
    return parts.length === 3 ? parts[2] + "/" + parts[1] + "/" + parts[0] : value;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>\"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char];
    });
  }

  function renderServices(services) {
    var panels = Array.prototype.slice.call(document.querySelectorAll(".tp[data-category]"));
    panels.forEach(function (panel) {
      panel.querySelectorAll(".row").forEach(function (row) { row.remove(); });
    });

    services.filter(function (service) { return service.active; }).forEach(function (service) {
      var panel = panels.find(function (candidate) { return candidate.dataset.category === service.category; });
      if (!panel) return;

      var row = document.createElement("div");
      row.className = "row" + (service.featured ? " pk" : "");
      row.dataset.serviceId = service.id;
      if (!service.active) row.hidden = true;

      var details = document.createElement("div");
      var name = document.createElement("h3");
      name.textContent = service.name;
      var description = document.createElement("p");
      description.textContent = service.description || "";
      var price = document.createElement("div");
      price.className = "pr";
      price.textContent = money(service.price_cop);
      details.append(name, description);
      row.append(details, price);
      panel.appendChild(row);
    });

    window.SV = services.filter(function (service) { return service.active; }).map(function (service) {
      return { n: service.name, d: service.description || "", p: money(service.price_cop), m: service.category };
    });
    if (typeof window.filter === "function") window.filter();
  }

  function renderPlans(plans, promotion) {
    var today = new Date().toISOString().slice(0, 10);
    var promoActive = !!(promotion && promotion.active && promotion.starts_on <= today && promotion.ends_on >= today);
    var tag = document.getElementById("promo-tag");
    var copy = document.getElementById("promo-copy");

    if (tag) {
      tag.hidden = !promoActive;
      if (promoActive) tag.textContent = promotion.title + " · hasta el " + formatDate(promotion.ends_on);
    }
    if (copy) {
      copy.replaceChildren();
      if (promoActive) {
        copy.appendChild(document.createTextNode("Paquetes con precio especial frente a contratar cada servicio por separado. Promoción válida hasta el "));
        var end = document.createElement("b");
        end.textContent = formatDate(promotion.ends_on);
        copy.appendChild(end);
      } else {
        copy.textContent = "Precios de los paquetes vigentes. Consulta con un asesor la ruta que mejor se ajusta a tus objetivos.";
      }
    }

    plans.forEach(function (plan) {
      var card = document.querySelector('[data-plan-id="' + plan.id + '"]');
      if (!card) return;
      card.hidden = !plan.active;
      var name = card.querySelector('[data-field="name"]');
      var phase = card.querySelector('[data-field="phase"]');
      var reference = card.querySelector('[data-field="reference"]');
      var price = card.querySelector('[data-field="price"]');
      var savings = card.querySelector('[data-field="savings"]');
      var features = card.querySelector('[data-field="features"]');
      var link = card.querySelector('[data-field="whatsapp"]');
      var ribbon = card.querySelector(".ribbon");
      card.classList.toggle("top", !!plan.featured);
      if (ribbon) ribbon.hidden = !plan.featured;
      var referencePrice = Number(plan.reference_price_cop) || 0;
      var promoPrice = Number(plan.promo_price_cop) || referencePrice;
      var currentPrice = promoActive ? promoPrice : referencePrice;

      if (name) name.textContent = plan.name;
      if (phase) phase.textContent = plan.phase_label;
      if (reference) {
        reference.textContent = "Valor individual " + money(referencePrice);
        reference.hidden = !promoActive || promoPrice >= referencePrice;
      }
      if (price) price.textContent = money(currentPrice);
      if (savings) {
        var saved = Math.max(referencePrice - promoPrice, 0);
        savings.textContent = "Ahorras " + money(saved);
        savings.hidden = !promoActive || saved === 0;
      }
      if (features) {
        features.replaceChildren();
        (Array.isArray(plan.features) ? plan.features : []).forEach(function (feature) {
          var item = document.createElement("li");
          item.textContent = feature;
          features.appendChild(item);
        });
      }
      if (link && typeof window.wa === "function") link.href = window.wa(plan.name + " (" + money(currentPrice) + ")");
    });

    var promoRule = Array.isArray(window.KB) && window.KB.find(function (rule) { return rule[0].test("promoción"); });
    if (promoRule) {
      promoRule[1] = function () {
        if (!promoActive) return "No hay promociones activas en este momento. Puedes consultar los precios vigentes en la sección Tarifario.";
        return "Promoción: " + escapeHtml(promotion.title) + ", válida hasta el " + formatDate(promotion.ends_on) + ":" + plans.filter(function (plan) { return plan.active; }).map(function (plan) {
          return "<div class=\"it\"><span>" + escapeHtml(plan.name) + "</span><b>" + money(plan.promo_price_cop) + "</b></div>";
        }).join("");
      };
    }
  }

  async function load() {
    var results = await Promise.all([
      client.from("services").select("id,category,name,description,price_cop,display_order,featured,active").order("display_order"),
      client.from("plans").select("id,name,phase_label,reference_price_cop,promo_price_cop,features,featured,display_order,active").order("display_order"),
      client.from("site_promotions").select("id,title,starts_on,ends_on,active").eq("id", 1).maybeSingle()
    ]);

    if (!results[0].error && results[0].data && results[0].data.length) renderServices(results[0].data);
    if (!results[1].error && results[1].data && results[1].data.length) renderPlans(results[1].data, results[2].error ? null : results[2].data);
  }

  load().catch(function () {
    // La página conserva el contenido estático inicial si Supabase no está disponible.
  });
})();
