(function () {
  var config = window.SUPABASE_CONFIG || {};
  var validUrl = typeof config.url === "string" && config.url.indexOf("https://") === 0 && config.url.indexOf("TU-PROYECTO") === -1;
  var validKey = typeof config.anonKey === "string" && config.anonKey.length > 20 && config.anonKey.indexOf("TU_CLAVE") === -1;

  window.hlSupabase = null;
  window.hlSupabaseReady = false;
  if (!window.supabase || !window.supabase.createClient || !validUrl || !validKey) return;

  window.hlSupabase = window.supabase.createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.hlSupabaseReady = true;
})();
