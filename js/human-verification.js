(() => {
  // node_modules/botid/dist/client/core/index.mjs
  function m(i3) {
    return new Promise((t, r) => {
      if (document.querySelector(`script[src="${i3}"]`)) {
        t();
        return;
      }
      let o = document.createElement("script");
      o.src = i3, o.async = true, o.onload = () => t(), o.onerror = (s) => {
        console.error("Error loading script", s), r(s);
      }, document.head.appendChild(o);
    });
  }
  var P = "/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/a-4-a/c.js";
  var f = class i {
    #e;
    #t;
    #n = 0;
    constructor() {
      let { promise: e, resolve: t } = i.#s();
      this.#e = e, this.#t = t, this.#r(), window.addEventListener("online", this.#o), window.addEventListener("visibilitychange", this.#o);
    }
    getChallenge = async () => (await this.#a(), await this.#e.then((t) => typeof t == "function" ? t() : t));
    #o = () => {
      if (document.hidden) return;
      let { promise: e, resolve: t } = i.#s();
      this.#e = e, this.#t = t, window.V_C = [], window.V_C.push = t;
      let r = document.querySelector('script[src*="c.js"]');
      r && r.remove(), this.#n += 1;
    };
    #r = () => {
      if (window.V_C) {
        let e = window.V_C.pop();
        e && this.#t(e);
      } else window.V_C = [], window.V_C.push = this.#t;
    };
    #a = () => {
      let e = new URL(P, window.location.origin);
      return e.searchParams.set("i", String(this.#n)), e.searchParams.set("v", String(3)), e.searchParams.set("h", window.location.host), m(e.pathname + e.search);
    };
    #i = () => {
      window.V_C = void 0;
    };
    static #s() {
      let e, t;
      return { promise: new Promise((o, s) => {
        e = o, t = s;
      }), resolve: e, reject: t };
    }
  };
  var b = "/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3";
  var g = class i2 {
    #e = false;
    #t;
    constructor(e) {
      this.#t = e;
    }
    get loaded() {
      return this.#e;
    }
    load = async () => {
      this.#e || await this.#o();
    };
    #n = () => {
      if (typeof globalThis.window > "u") throw new Error("KPSDK is not available in the server");
      if (!window.KPSDK) throw new Error("KPSDK is not loaded");
      let e = this.#t.map((t) => {
        let r = i2.#r(t.path);
        return { domain: r.host, path: r.pathname, method: t.method };
      });
      try {
        window.KPSDK.configure(e);
      } catch (t) {
        console.error("Error configuring KPSDK...", t);
      }
    };
    #o = async () => {
      let e = `${b}/p.js`, t = this;
      return new Promise((r, o) => {
        let s = () => {
          document.removeEventListener("kpsdk-load", s), this.#n();
        }, c = () => {
          document.removeEventListener("kpsdk-ready", c), t.#e = true, r();
        };
        document.addEventListener("kpsdk-load", s, { once: true }), document.addEventListener("kpsdk-ready", c, { once: true }), m(e).catch((l) => {
          document.removeEventListener("kpsdk-load", s), document.removeEventListener("kpsdk-ready", c), o(l);
        });
      });
    };
    static #r(e) {
      let t;
      try {
        t = new URL(e);
      } catch {
        t = new URL(e, location.origin);
      }
      return t;
    }
  };
  var w = (i3) => {
    let e = i3.replace(/[.?+^$[\]\\(){}|-]/g, "\\$&").split("*").join(".*");
    return new RegExp(`^${e}$`);
  };
  var R = ({ path: i3, pattern: e }) => i3.search(e) !== -1;
  function L(i3, e, t) {
    let r = window.fetch;
    window.fetch = async (o, s) => {
      let c = new URL(o instanceof Request ? o.url : o, location.href), l = c.origin === location.origin, p = s?.method ?? (o instanceof Request ? o.method : "GET"), d = t.find((a) => {
        let y = R({ path: c.pathname, pattern: w(a.path) }), v = a.method.toLowerCase() === p.toLowerCase() || a.method === "*";
        return y && v;
      });
      if (d == null || !l) return r(o, s);
      let u = await i3.getChallenge(), h = new Headers(s?.headers || (o instanceof Request ? o.headers : void 0));
      h.set("x-is-human", JSON.stringify(u)), h.set("x-path", c.pathname), h.set("x-method", p);
      let n = { ...s, headers: h };
      return e.loaded || u.b !== 0 ? r(o, n) : u.d === 1 || d?.advancedOptions?.checkLevel === "deepAnalysis" ? (await e.load(), window.fetch(o, n)) : r(o, n);
    };
  }
  async function x(i3, e, t) {
    let r = XMLHttpRequest.prototype.open, o = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(s, c, l, p, d) {
      return this._requestUrl = c.toString(), this._requestMethod = s, r.call(this, s, c, l ?? true, p, d);
    }, XMLHttpRequest.prototype.send = async function(s) {
      let c = this._requestUrl;
      if (!c) return o.call(this, s);
      if (this._isReexecution) return o.call(this, s);
      let l = new URL(c, location.href), p = l.origin === location.origin, d = this._requestMethod ?? "GET", u = t.find((a) => {
        let y = R({ path: l.pathname, pattern: w(a.path) }), v = a.method.toLowerCase() === d.toLowerCase() || a.method === "*";
        return y && v;
      });
      if (!u || !p) return o.call(this, s);
      let h = await i3.getChallenge();
      if (this.setRequestHeader("x-is-human", JSON.stringify(h)), this.setRequestHeader("x-path", l.pathname), this.setRequestHeader("x-method", d), h.b !== 0) return o.call(this, s);
      if (e.loaded) return o.call(this, s);
      if ((h.d === 1 || u?.advancedOptions?.checkLevel === "deepAnalysis") && await e.load(), !e.loaded) return o.call(this, s);
      this.setRequestHeader("x-is-human", JSON.stringify(h)), this.setRequestHeader("x-path", l.pathname), this.setRequestHeader("x-method", d);
      let n = new XMLHttpRequest();
      return n._isReexecution = true, n.open(d, c, true), n.setRequestHeader("x-is-human", JSON.stringify(h)), n.setRequestHeader("x-path", l.pathname), n.setRequestHeader("x-method", d), this.timeout && (n.timeout = this.timeout), this.responseType && (n.responseType = this.responseType), this.withCredentials && (n.withCredentials = this.withCredentials), n.onreadystatechange = () => {
        Object.defineProperty(this, "readyState", { value: n.readyState, writable: true, configurable: true }), n.readyState === XMLHttpRequest.DONE && (Object.defineProperty(this, "status", { value: n.status, writable: true, configurable: true }), Object.defineProperty(this, "statusText", { value: n.statusText, writable: true, configurable: true }), Object.defineProperty(this, "response", { value: n.response, writable: true, configurable: true }), Object.defineProperty(this, "responseText", { value: n.responseText, writable: true, configurable: true }), Object.defineProperty(this, "responseXML", { value: n.responseXML, writable: true, configurable: true }), this.getAllResponseHeaders = () => n.getAllResponseHeaders(), this.getResponseHeader = (a) => n.getResponseHeader(a)), this.onreadystatechange && this.onreadystatechange.call(this, new Event("readystatechange"));
      }, n.onload = (a) => {
        this.onload && this.onload.call(this, a);
      }, n.onerror = (a) => {
        this.onerror && this.onerror.call(this, a);
      }, n.onabort = (a) => {
        this.onabort && this.onabort.call(this, a);
      }, n.ontimeout = (a) => {
        this.ontimeout && this.ontimeout.call(this, a);
      }, n.onloadstart = (a) => {
        this.onloadstart && this.onloadstart.call(this, a);
      }, n.onloadend = (a) => {
        this.onloadend && this.onloadend.call(this, a);
      }, n.onprogress = (a) => {
        this.onprogress && this.onprogress.call(this, a);
      }, n.send(s);
    };
  }
  function C({ protect: i3 = [] }) {
    for (let r of i3) if (r.advancedOptions?.checkLevel !== void 0 && r.advancedOptions.checkLevel !== "deepAnalysis" && r.advancedOptions.checkLevel !== "basic") throw new Error(`Invalid checkLevel "${r.advancedOptions.checkLevel}" for route "${r.path}". Must be one of: deepAnalysis, basic`);
    let e = new f(), t = new g(i3);
    x(e, t, i3).catch((r) => {
      console.error("Error patching XMLHttpRequest:", r);
    }), L(e, t, i3);
  }

  // js/human-verification-entry.js
  C({ protect: [
    { path: "/api/leaderboards", method: "POST", advancedOptions: { checkLevel: "basic" } },
    { path: "/api/xaman-vending-start", method: "POST", advancedOptions: { checkLevel: "basic" } }
  ] });
  window.ATMTownHumanCheck = async function() {
    const response = await fetch("/api/leaderboards?action=rewards-human-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(2e4) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.verified !== true) throw new Error(data.error || "Could not verify your browser. Refresh ATM Town and try again.");
  };
})();
