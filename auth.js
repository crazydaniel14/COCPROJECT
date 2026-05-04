/* ── AUTH ───────────────────────────────────────────────────────────────────
   Keeps the session token and username in closure scope so they are never
   directly readable as plain properties on window.
   Loaded by: index.html, building.html, schedule.html  (before any other JS)
   ────────────────────────────────────────────────────────────────────────── */

window.Auth = (() => {
  let _token    = '';
  let _username = '';

  return {
    setToken(t)    { _token    = (t && typeof t === 'string') ? t : ''; },
    getToken()     { return _token; },
    setUsername(u) { _username = (u && typeof u === 'string') ? u.toLowerCase() : ''; },
    getUsername()  { return _username; },
    tok()          { return _token ? `&token=${encodeURIComponent(_token)}` : ''; },
    clear()        { _token = ''; _username = ''; }
  };
})();
