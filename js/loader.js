/* Loads the 3D data (binary + JSON) in parallel, builds window.ILLUMINATI_MODEL, then loads the 3D scripts. */
(function () {
  var M = window.__MODEL__;
  function get(url, type, tries) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r[type](); })
      .catch(function (e) { if (tries > 0) return get(url, type, tries - 1); throw e; });
  }
  function script(src) {
    return new Promise(function (ok, bad) {
      var el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = function () { bad(new Error(src)); };
      document.head.appendChild(el);
    });
  }
  Promise.all([get(M.json, 'json', 1), get(M.bin, 'arrayBuffer', 1)]).then(function (r) {
    var meta = r[0], buf = r[1], PYR = { col: meta.col, nrm: meta.nrm };
    Object.keys(meta.layout).forEach(function (k) {
      var l = meta.layout[k]; PYR[k] = l[2] === 'u32' ? new Uint32Array(buf, l[0], l[1]) : new Float32Array(buf, l[0], l[1]);
    });
    window.ILLUMINATI_MODEL = { LOGO: meta.LOGO, PYR: PYR };
    return script('js/chrome.js').then(function () { return script('js/card.js'); });
  }).catch(function (e) { console.error(e); if (document.body) document.body.classList.add('no-webgl'); });
})();
