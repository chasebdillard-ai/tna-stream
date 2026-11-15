/* TNA Stream: hubs, carousel, in-page player, sorting and search over the inlined catalog and clips. */
(function () {
  "use strict";
  var doc = document;
  function parse(id) { var el = doc.getElementById(id); try { return JSON.parse((el && el.textContent) || "[]"); } catch (e) { return []; } }
  var CAT = parse("catalog"), CLIPS = parse("clips"), LIB = parse("library"), XD = parse("xdiv");
  var LIVE = { lkYx5SQlHWQ: "LIVE SUN 5 PM ET", SIQYaa3ahYA: "LIVE SUN 6 PM ET" };
  var LIB_CATS = ["Full Matches", "Moments & Highlights", "Matches & Segments", "Interviews & Features"];
  LIB.forEach(function (d, i) { d._i = i; d._k = "lib"; d.title = d.t; d.year = d.y; d.mins = d.m; });
  XD.forEach(function (d, i) { d._i = i; d._k = "xdiv"; d.title = d.t; d.year = d.y; d.mins = d.m; d._n = i + 1; d._live = LIVE[d.id] || ""; });

  var SHOWS = { ppv: "Pay-Per-Views & Specials", impact: "iMPACT!", xplosion: "Xplosion", asylum: "Asylum Years", vault: "Vault Collections" };
  var BRANDS = ["Bound For Glory", "Slammiversary", "Lockdown", "Destination X", "Sacrifice", "Genesis", "Final Resolution", "Against All Odds",
    "Turning Point", "Victory Road", "No Surrender", "Hard Justice", "Hardcore Justice", "Under Siege", "Rebellion", "Hard To Kill", "World X-Cup"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var KEY = {};
  Object.keys(SHOWS).forEach(function (k) { KEY[SHOWS[k]] = k; });

  CAT.forEach(function (d, i) {
    d._i = i; d._k = KEY[d.show];
    if (!d.id && d.url) { var m = String(d.url).match(/(?:[?&]v=|youtu\.be\/|\/embed\/)([\w-]{6,})/); if (m) d.id = m[1]; }
  });
  CLIPS.forEach(function (d, i) { d._i = i; d._k = "clip"; d.year = d.date ? Number(d.date.slice(0, 4)) : null; });
  var by = {};
  Object.keys(SHOWS).forEach(function (k) { by[k] = CAT.filter(function (d) { return d._k === k; }); });

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function hm(m) { m = Math.round(m || 0); var h = Math.floor(m / 60), r = m % 60; return h ? h + "h" + (r ? " " + r + "m" : "") : r + "m"; }
  function mss(m) { var s = Math.round((m || 0) * 60), mm = Math.floor(s / 60), ss = s % 60; return mm + ":" + (ss < 10 ? "0" : "") + ss; }
  function dur(d) {
    if ((d._k === "lib" || d._k === "xdiv") && d.mins == null) return "";
    return d._k === "clip" ? mss(d.mins) : hm(d.mins);
  }
  function fmtDate(iso, weekday) {
    if (!iso) return "";
    var p = iso.split("-").map(Number), dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return (weekday ? DAYS[dt.getUTCDay()] + ", " : "") + MONTHS[p[1] - 1] + " " + p[2] + ", " + p[0];
  }
  function when(d) { return d.date ? fmtDate(d.date) : (d.year ? String(d.year) : ""); }
  function thumb(id, size) { return "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/" + (size || "hqdefault") + ".jpg"; }
  function watchUrl(id) { return "https://www.youtube.com/watch?v=" + encodeURIComponent(id); }
  function cmpStr(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function chronoKey(d) { return d.date ? d.date : (d.year ? d.year + "-00-00" : "9999"); }
  function chrono(a, b) { return cmpStr(chronoKey(a), chronoKey(b)) || a._i - b._i; }
  function brandOf(d) { return BRANDS.indexOf(d.event) >= 0 ? d.event : "Other"; }
  function splitTitle(t) {
    var i = t.indexOf("|");
    if (i >= 0) return [t.slice(0, i).trim(), t.slice(i + 1).trim()];
    var m = t.match(/^(.+?)(?::\s+|\s+-\s+)(.+)$/);
    if (m) return [m[1].trim(), m[2].trim()];
    return [t, ""];
  }
  function ppvHead(d) {
    var parts = splitTitle(d.title), head = parts[0].replace(/^TNA\s+(?!Wrestling)/, "");
    if (d.year && head.indexOf(String(d.year)) < 0) head += " " + d.year;
    return [head, parts[1]];
  }
  function xplSub(t) { return t.replace(/\s*\|\s*(TNA\s+)?Xplosion\b.*$/i, "").trim(); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }
  function sum(list) { return list.reduce(function (s, d) { return s + (d.mins || 0); }, 0); }

  function disp(d) {
    var k = d._k, p;
    if (k === "ppv") { p = ppvHead(d); return { kicker: "PPV", head: p[0], sub: p[1] }; }
    if (k === "impact") { p = splitTitle(d.title); return { kicker: "iMPACT!" + (d.era ? " · " + d.era : ""), head: p[0], sub: p[1] }; }
    if (k === "xplosion") return { kicker: "Xplosion", head: xplSub(d.title) || d.title, sub: "" };
    if (k === "clip") return { kicker: "iMPACT! clip · " + (d.era === "AMC" ? "AMC" : d.era), head: d.title, sub: "" };
    if (k === "lib") { p = splitTitle(d.title); return { kicker: d.c, head: p[0], sub: p[1] }; }
    if (k === "xdiv") return { kicker: d.ch, head: d.title, sub: "" };
    return { kicker: k === "asylum" ? "Asylum Years" : "Vault", head: d.title, sub: "" };
  }

  /* ---------- play contexts: each list a card belongs to, for Up next ---------- */
  var CTX = {};
  var PLAY_SVG = '<svg width="16" height="16" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>';
  function card(d, ctx, pos, opts) {
    opts = opts || {};
    var t = disp(d), w = when(d), dd = dur(d), pin = d._live || opts.pin;
    return '<button class="x-card' + (opts.rail ? " x-card--rail" : "") + (opts.playing ? " is-playing" : "") + '" type="button" data-ctx="' + esc(ctx) + '" data-pos="' + pos + '"' +
      (opts.playing ? ' aria-current="true"' : "") + ' aria-label="' + esc("Play " + d.title + (w ? ", " + w : "") + (dd ? ", " + dd : "") + (d._live ? ", " + d._live : "")) + '">' +
      '<span class="x-thumb"><img src="' + thumb(d.id, opts.rail || opts.small ? "mqdefault" : "hqdefault") + '" alt="" loading="lazy" decoding="async" />' +
      (pin ? '<span class="x-pin' + (d._live ? "" : opts.pinY ? " x-pin--y" : "") + '">' + esc(pin) + "</span>" : "") +
      '<span class="x-playdot" aria-hidden="true">' + PLAY_SVG + "</span>" + (dd ? '<span class="x-dur">' + dd + "</span>" : "") + "</span>" +
      '<span class="x-card__body"><span class="x-card__head">' + esc(t.head) + "</span>" +
      (t.sub && !opts.rail ? '<span class="x-card__sub">' + esc(t.sub) + "</span>" : "") +
      '<span class="x-card__meta">' + esc(opts.kicker === false ? w : [t.kicker, w].filter(Boolean).join(" · ")) + "</span></span></button>";
  }
  function cards(list, ctx, opts) { CTX[ctx] = list; return list.map(function (d, i) { return card(d, ctx, i, opts); }).join(""); }

  /* ---------- iMPACT! clip episodes, one per night ---------- */
  var EPS = [], EP_BY = {};
  CLIPS.forEach(function (c) {
    var ep = EP_BY[c.date];
    if (!ep) { ep = EP_BY[c.date] = { date: c.date, era: c.era, clips: [] }; EPS.push(ep); }
    ep.clips.push(c);
  });
  EPS.forEach(function (ep) {
    ep.key = "ep-" + ep.date;
    ep.cover = ep.clips.filter(function (c) { return c.top10; })[0] || ep.clips[0];
    CTX[ep.key] = ep.clips;
  });
  EPS.sort(function (a, b) { return cmpStr(b.date, a.date); });
  function epName(ep) { return ep.era === "AMC" ? "Thursday Night iMPACT! on AMC" : "iMPACT! on " + ep.era; }
  function epCard(ep) {
    var c = ep.cover;
    return '<button class="x-card" type="button" data-ctx="' + ep.key + '" data-pos="0" aria-label="' + esc("Play iMPACT! " + fmtDate(ep.date) + ", " + plural(ep.clips.length, "clip")) + '">' +
      '<span class="x-thumb"><img src="' + thumb(c.id) + '" alt="" loading="lazy" decoding="async" /><span class="x-pin x-pin--y">' + plural(ep.clips.length, "clip") + "</span>" +
      '<span class="x-playdot" aria-hidden="true">' + PLAY_SVG + '</span><span class="x-dur">' + hm(sum(ep.clips)) + "</span></span>" +
      '<span class="x-card__body"><span class="x-card__head">iMPACT! · ' + esc(fmtDate(ep.date)) + "</span>" +
      '<span class="x-card__sub">' + esc(ep.clips[0].title) + "</span>" +
      '<span class="x-card__meta"><span class="x-netlogo" aria-hidden="true"></span>' + esc(epName(ep)) + "</span></span></button>";
  }

  /* ---------- grouping by year ---------- */
  function grouped(items, dir) {
    items = items.slice().sort(chrono);
    var known = items.filter(function (d) { return d.year; }), unknown = items.filter(function (d) { return !d.year; });
    if (dir === "new") known.reverse();
    var groups = [], cur = null;
    known.forEach(function (d) {
      var y = String(d.year);
      if (!cur || cur.label !== y) { cur = { label: y, items: [] }; groups.push(cur); }
      cur.items.push(d);
    });
    if (unknown.length) groups.push({ label: "Year not listed", items: unknown });
    return groups;
  }
  function renderGroups(id, groups, ctx) {
    var flat = [];
    groups.forEach(function (g) { flat = flat.concat(g.items); });
    CTX[ctx] = flat;
    var n = 0;
    doc.getElementById(id).innerHTML = groups.map(function (g) {
      return '<div class="x-group"><h3 class="x-year">' + esc(g.label) + " <small>" + plural(g.items.length, "video") + "</small></h3>" +
        '<div class="x-grid">' + g.items.map(function (d) { return card(d, ctx, n++, { kicker: false }); }).join("") + "</div></div>";
    }).join("") || '<p class="x-empty">Nothing here yet.</p>';
  }
  function setCount(id, html) { doc.getElementById(id).innerHTML = html; }

  /* ---------- hubs ---------- */
  var SORT = { ppv: "old", impact: "old", xplosion: "old", asylum: "old", vault: "old" };
  var ppvFilter = "All";

  function renderPPV() {
    var items = by.ppv.filter(function (d) { return ppvFilter === "All" || brandOf(d) === ppvFilter; });
    setCount("count-ppv", "<b>" + items.length + "</b> " + (items.length !== by.ppv.length ? "of " + by.ppv.length + " " : "") + "events");
    renderGroups("list-ppv", grouped(items, SORT.ppv), "ppv");
  }
  function renderXplosion() {
    setCount("count-xplosion", "<b>" + by.xplosion.length + "</b> episodes");
    renderGroups("list-xplosion", grouped(by.xplosion, SORT.xplosion), "xplosion");
  }
  function epNum(d) { var m = d.title.match(/Ep\.?\s*(\d+)/i); return m ? Number(m[1]) : 1000 + d._i; }
  function renderAsylum() {
    var items = by.asylum.slice().sort(function (a, b) { return epNum(a) - epNum(b); });
    if (SORT.asylum === "new") items.reverse();
    setCount("count-asylum", "<b>" + items.length + "</b> episodes");
    doc.getElementById("list-asylum").innerHTML = cards(items, "asylum", { kicker: false });
  }
  function renderVault() {
    var items = by.vault.slice().sort(function (a, b) { return a.title.localeCompare(b.title, "en", { sensitivity: "base", numeric: true }); });
    if (SORT.vault === "new") items.reverse();
    setCount("count-vault", "<b>" + items.length + "</b> collections");
    doc.getElementById("list-vault").innerHTML = cards(items, "vault", { kicker: false });
  }

  var ERAS = [].slice.call(doc.querySelectorAll("#list-impact .x-era"));
  ERAS.forEach(function (sec) {
    var names = (sec.getAttribute("data-alt") || sec.getAttribute("data-era")).split("|");
    sec._full = by.impact.filter(function (d) { return names.indexOf(d.era) >= 0; });
    sec._eps = EPS.filter(function (ep) { return names.indexOf(ep.era) >= 0; });
    var img = sec.querySelector(".x-netplate img");
    if (img) sec.style.setProperty("--net", 'url("' + img.src + '")');
    sec.hidden = !sec._full.length && !sec._eps.length;
  });
  function renderImpact() {
    var list = doc.getElementById("list-impact"), order = ERAS.slice();
    if (SORT.impact === "new") order.reverse();
    order.forEach(function (sec) { list.appendChild(sec); });
    ERAS.forEach(function (sec) {
      if (sec.hidden) return;
      var full = sec._full.slice().sort(chrono);
      if (SORT.impact === "new") full.reverse();
      var ctx = "era-" + sec.id;
      var fullEl = sec.querySelector('[data-f="full"]');
      fullEl.innerHTML = cards(full, ctx, { kicker: false });
      fullEl.hidden = !full.length;
      var rec = sec.querySelector('[data-f="recent"]'), rh = sec.querySelector('[data-f="recent-head"]');
      if (rec) { rec.innerHTML = sec._eps.map(epCard).join(""); rec.hidden = rh.hidden = !sec._eps.length; }
      var clipN = sec._eps.reduce(function (s, ep) { return s + ep.clips.length; }, 0), bits = [];
      bits.push(full.length ? "<b>" + full.length + "</b> full " + (full.length === 1 ? "episode" : "episodes") : "Clips only");
      if (sec._eps.length) bits.push("<b>" + sec._eps.length + "</b> recent episodes", "<b>" + clipN + "</b> clips");
      sec.querySelector('[data-f="count"]').innerHTML = bits.join(" · ");
    });
    setCount("count-impact", "<b>" + by.impact.length + "</b> full episodes · <b>" + EPS.length + "</b> nights of clips · <b>" + CLIPS.length + "</b> clips");
  }
  (function eraChips() {
    var wrap = doc.getElementById("era-chips");
    wrap.innerHTML = ERAS.filter(function (s) { return !s.hidden; }).map(function (s) {
      return '<button class="x-chip" type="button" data-jump="' + s.id + '">' + esc(s.getAttribute("data-label")) + " <small>" + (s._full.length + s._eps.length) + "</small></button>";
    }).join("");
  })();

  var RENDER = { ppv: renderPPV, impact: renderImpact, xplosion: renderXplosion, asylum: renderAsylum, vault: renderVault };

  [].slice.call(doc.querySelectorAll("[data-sort]")).forEach(function (g) {
    var k = g.getAttribute("data-sort"), labels = k === "vault" ? ["A to Z", "Z to A"] : ["Oldest", "Newest"];
    g.innerHTML = '<button type="button" data-dir="old" aria-pressed="true">' + labels[0] + '</button><button type="button" data-dir="new" aria-pressed="false">' + labels[1] + "</button>";
    g.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-dir]");
      if (!btn) return;
      SORT[k] = btn.getAttribute("data-dir");
      [].slice.call(g.querySelectorAll("button")).forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      RENDER[k]();
    });
  });

  (function ppvChips() {
    var counts = { All: by.ppv.length };
    by.ppv.forEach(function (d) { var b = brandOf(d); counts[b] = (counts[b] || 0) + 1; });
    var wrap = doc.getElementById("ppv-chips");
    wrap.innerHTML = ["All"].concat(BRANDS, ["Other"]).filter(function (b) { return counts[b]; }).map(function (b) {
      return '<button class="x-chip" type="button" data-brand="' + esc(b) + '" aria-pressed="' + (b === "All") + '">' + esc(b) + " <small>" + counts[b] + "</small></button>";
    }).join("");
    wrap.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-brand]");
      if (!btn) return;
      ppvFilter = btn.getAttribute("data-brand");
      [].slice.call(wrap.querySelectorAll("button")).forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      renderPPV();
    });
  })();

  Object.keys(RENDER).forEach(function (k) { RENDER[k](); });

  /* ---------- home: carousel and rails ---------- */
  function newestFirst(a, b) { return cmpStr(chronoKey(b) === "9999" ? "0" : chronoKey(b), chronoKey(a) === "9999" ? "0" : chronoKey(a)) || b._i - a._i; }
  var ppvNew = by.ppv.slice().sort(newestFirst);
  var xplNew = by.xplosion.slice().sort(newestFirst);
  CTX["ppv-new"] = ppvNew;
  CTX["xpl-new"] = xplNew;
  var SLIDE = {};
  function fillSlide(id, o) {
    var s = doc.getElementById(id);
    if (!s || !o) return;
    s.querySelector(".x-slide__bg").src = thumb(o.thumb);
    [["title", o.title], ["sub", o.sub], ["eyebrow", o.eyebrow], ["time", o.time]].forEach(function (f) {
      var el = s.querySelector('[data-f="' + f[0] + '"]');
      if (el && f[1] != null) el.textContent = f[1];
    });
    s.querySelector('[data-f="play"]').setAttribute("aria-label", "Play " + o.title);
    SLIDE[id] = o;
  }
  if (ppvNew[0]) {
    var p = ppvHead(ppvNew[0]);
    fillSlide("slide-ppv", { ctx: "ppv-new", pos: 0, thumb: ppvNew[0].id, title: "TNA " + p[0], sub: p[1], time: hm(ppvNew[0].mins) });
  }
  if (xplNew[0]) {
    fillSlide("slide-xpl", { ctx: "xpl-new", pos: 0, thumb: xplNew[0].id, eyebrow: "Latest Xplosion · " + fmtDate(xplNew[0].date),
      title: xplSub(xplNew[0].title), sub: "The newest episode of TNA's weekly match show.", time: hm(xplNew[0].mins) });
  }
  var lastEp = EPS[0];
  if (lastEp) {
    fillSlide("slide-imp", { ctx: lastEp.key, pos: 0, thumb: lastEp.cover.id, eyebrow: "Latest iMPACT! · " + fmtDate(lastEp.date) + " · Clips & moments",
      title: lastEp.era === "AMC" ? "Thursday Night iMPACT!" : "iMPACT!",
      sub: "On " + lastEp.era + " · " + plural(lastEp.clips.length, "clip") + ", starting with " + lastEp.clips[0].title + ".",
      time: plural(lastEp.clips.length, "clip") });
  }

  var clipNew = CLIPS.slice().sort(function (a, b) { return cmpStr(b.date, a.date) || a._i - b._i; }).slice(0, 12);
  doc.getElementById("rail-clips").innerHTML = cards(clipNew, "rail-clips", { rail: true, kicker: false });
  doc.getElementById("rail-xplosion").innerHTML = cards(xplNew.slice(0, 10), "rail-xpl", { rail: true, kicker: false });
  var bfg = by.ppv.filter(function (d) { return d.event === "Bound For Glory"; }).sort(chrono);
  doc.getElementById("rail-bfg").innerHTML = cards(bfg, "rail-bfg", { rail: true, kicker: false });
  var classic = by.impact.filter(function (d) { return d.era === "FSN" || d.era === "Spike TV"; }).sort(chrono);
  doc.getElementById("rail-classic").innerHTML = cards(classic, "rail-classic", { rail: true, kicker: false });

  /* ---------- X-Division playlist ---------- */
  CTX.xdiv = XD;
  SLIDE["slide-xdiv"] = { ctx: "xdiv", pos: 0 };
  if (doc.getElementById("rail-xdiv")) doc.getElementById("rail-xdiv").innerHTML = XD.map(function (d, i) { return card(d, "xdiv", i, { rail: true, pin: String(i + 1), pinY: true }); }).join("");
  (function renderXdiv() {
    var chapters = [], byCh = {};
    XD.forEach(function (d) { if (!byCh[d.ch]) { byCh[d.ch] = []; chapters.push(d.ch); } byCh[d.ch].push(d); });
    doc.getElementById("xdiv-chips").innerHTML = chapters.map(function (c, i) {
      return '<button class="x-chip" type="button" data-jump="xch-' + i + '">' + esc(c) + " <small>" + byCh[c].length + "</small></button>";
    }).join("");
    doc.getElementById("list-xdiv").innerHTML = chapters.map(function (c, i) {
      return '<div class="x-group" id="xch-' + i + '"><h3 class="x-year">' + esc(c) + " <small>" + plural(byCh[c].length, "video") + "</small></h3>" +
        '<div class="x-rows">' + byCh[c].map(function (d) {
          var dd = dur(d);
          return '<button class="x-row" type="button" data-ctx="xdiv" data-pos="' + (d._n - 1) + '" aria-label="' + esc(d._n + " of " + XD.length + ". Play " + d.title + (d.year ? ", " + d.year : "") + (dd ? ", " + dd : "") + (d._live ? ", " + d._live : "")) + '">' +
            '<span class="x-row__n" aria-hidden="true">' + d._n + "</span>" +
            '<span class="x-thumb"><img src="' + thumb(d.id, "mqdefault") + '" alt="" loading="lazy" decoding="async" /></span>' +
            '<span class="x-row__text"><span class="x-row__title">' + esc(d.title) + "</span>" +
            '<span class="x-row__meta">' + (d.year ? "<span>" + d.year + "</span>" : "") + (dd ? "<span>" + dd + "</span>" : "") +
            (d._live ? '<span class="x-live">' + esc(d._live) + "</span>" : "") + "</span></span></button>";
        }).join("") + "</div></div>";
    }).join("");
  })();

  /* ---------- the TNA Library: filtered, sorted, rendered in batches ---------- */
  function byRecent(a, b) { return a.r - b.r; }
  function byOldest(a, b) {
    if (a.y == null && b.y != null) return 1;
    if (b.y == null && a.y != null) return -1;
    return (a.y || 0) - (b.y || 0) || b.r - a.r;
  }
  var libRecent = LIB.slice().sort(byRecent), libOld = LIB.slice().sort(byOldest);
  [["rail-lib-fm", "Full Matches", 16], ["rail-lib-mh", "Moments & Highlights", 16], ["rail-lib-if", "Interviews & Features", 12]].forEach(function (r) {
    var list = libRecent.filter(function (d) { return d.c === r[1]; }).slice(0, r[2]);
    doc.getElementById(r[0]).innerHTML = cards(list, r[0], { rail: true, kicker: false });
  });
  var BATCH = 48, libCat = "All", libDir = "new", libShown = 0, libDirty = true;
  var libGrid = doc.getElementById("list-lib"), libMore = doc.getElementById("lib-more"), libChips = doc.getElementById("lib-chips");
  var libCounts = { All: LIB.length };
  LIB.forEach(function (d) { libCounts[d.c] = (libCounts[d.c] || 0) + 1; });
  libChips.innerHTML = ["All"].concat(LIB_CATS).map(function (c) {
    return '<button class="x-chip" type="button" data-libcat="' + esc(c) + '" aria-pressed="' + (c === "All") + '">' + esc(c) + " <small>" + (libCounts[c] || 0).toLocaleString("en-US") + "</small></button>";
  }).join("");
  function libMoreBatch() {
    var list = CTX.lib || [], end = Math.min(list.length, libShown + BATCH), html = "";
    for (var i = libShown; i < end; i++) html += card(list[i], "lib", i, { small: true });
    libGrid.insertAdjacentHTML("beforeend", html);
    libShown = end;
    libMore.hidden = libShown >= list.length;
    libMore.textContent = "Load more · " + (list.length - libShown).toLocaleString("en-US") + " left";
  }
  function renderLib() {
    var src = libDir === "new" ? libRecent : libOld;
    CTX.lib = libCat === "All" ? src : src.filter(function (d) { return d.c === libCat; });
    setCount("count-lib", "<b>" + CTX.lib.length.toLocaleString("en-US") + "</b> " + (libCat === "All" ? "videos" : esc(libCat).toLowerCase()) +
      (libCat === "All" ? "" : " of " + LIB.length.toLocaleString("en-US")) + " · " + (libDir === "new" ? "newest first" : "oldest first"));
    [].slice.call(libChips.querySelectorAll("button")).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-libcat") === libCat)); });
    libGrid.innerHTML = "";
    libShown = 0;
    libDirty = false;
    libMoreBatch();
  }
  libChips.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-libcat]");
    if (!b) return;
    libCat = b.getAttribute("data-libcat");
    renderLib();
  });
  doc.getElementById("lib-sort").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-ldir]");
    if (!b) return;
    libDir = b.getAttribute("data-ldir");
    [].slice.call(this.querySelectorAll("button")).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    renderLib();
  });
  libMore.addEventListener("click", libMoreBatch);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !libMore.hidden && !doc.getElementById("view-library").hidden) libMoreBatch();
      });
    }, { rootMargin: "0px 0px 600px 0px" }).observe(libMore);
  }

  /* carousel motion */
  var track = doc.getElementById("slides"), dots = [].slice.call(doc.querySelectorAll("#dots button")), slideIdx = 0, paused = false;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function goSlide(i) {
    slideIdx = (i + dots.length) % dots.length;
    track.scrollTo({ left: slideIdx * track.clientWidth, behavior: reduce ? "auto" : "smooth" });
    markDots();
  }
  function markDots() { dots.forEach(function (b, i) { if (i === slideIdx) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); }); }
  var scrollT;
  track.addEventListener("scroll", function () {
    clearTimeout(scrollT);
    scrollT = setTimeout(function () { var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); if (i !== slideIdx) { slideIdx = i; markDots(); } }, 80);
  }, { passive: true });
  dots.forEach(function (b, i) { b.addEventListener("click", function () { goSlide(i); }); });
  ["pointerenter", "focusin", "touchstart"].forEach(function (ev) { track.addEventListener(ev, function () { paused = true; }, { passive: true }); });
  ["pointerleave", "focusout", "touchend"].forEach(function (ev) { track.addEventListener(ev, function () { paused = false; }, { passive: true }); });
  setInterval(function () {
    if (paused || doc.hidden || !sheet.hidden || doc.getElementById("view-home").hidden) return;
    goSlide(slideIdx + 1);
  }, 6000);
  [].slice.call(doc.querySelectorAll(".x-slide")).forEach(function (s) {
    s.addEventListener("click", function (e) { if (e.target.closest("[data-go]")) return; var o = SLIDE[s.id]; if (o) openPlayer(o.ctx, o.pos, s.querySelector('[data-f="play"]')); });
  });

  /* ---------- Continue Watching (this device only, localStorage "tna_cw") ---------- */
  var CWK = "tna_cw", CW_LIST = [], IDX = {};
  CAT.concat(CLIPS, LIB, XD).forEach(function (d) { if (d.id && !IDX[d.id]) IDX[d.id] = d; });
  function cwLoad() { try { var a = JSON.parse(localStorage.getItem(CWK) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function cwSave(a) { try { localStorage.setItem(CWK, JSON.stringify(a.slice(0, 20))); } catch (e) { /* storage blocked or full */ } }
  function cwGet(id) { var a = cwLoad(); for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function cwRecord(d, ctx, pos) {
    if (!d || !d.id) return;
    var a = cwLoad(), old = null;
    a = a.filter(function (x) { if (x.id === d.id) { old = x; return false; } return true; });
    var it = { id: d.id, title: d.title, thumb: thumb(d.id, "mqdefault"), show: String(disp(d).kicker || "").replace(/\s*·\s*(undefined|null)$/, ""), ts: Date.now(), prog: 0, dur: d.mins ? Math.round(d.mins * 60) : 0 };
    if (ctx === "cw") { if (old) { it.ctx = old.ctx; it.pos = old.pos; } } else { it.ctx = ctx; it.pos = pos; }
    if (old) { it.prog = old.prog || 0; if (old.dur) it.dur = old.dur; }
    a.unshift(it); cwSave(a);
  }
  function cwProgress(id, t, dd) {
    var a = cwLoad(), ch = false;
    a.forEach(function (x) { if (x.id === id) { if (dd > 0) x.dur = Math.round(dd); x.prog = (dd > 0 && t > dd - 30) ? 0 : Math.round(t); ch = true; } });
    if (ch) cwSave(a);
  }
  function cwRemove(id) { cwSave(cwLoad().filter(function (x) { return x.id !== id; })); }
  function cwStart(id) { var x = cwGet(id); if (!x || !x.prog || x.prog <= 10) return 0; if (x.dur && x.prog >= x.dur - 30) return 0; return x.prog; }
  (function cwMount() {
    var st = doc.createElement("style");
    st.textContent = "#cw[hidden]{display:none!important}.x-cw{position:relative;min-width:0}.x-cw .x-card{width:100%}" +
      ".x-cwbar{position:absolute;left:0;right:0;bottom:0;height:5px;background:rgba(255,255,255,.25);z-index:3}.x-cwbar>span{display:block;height:100%;background:var(--x-red,#e1251b)}" +
      ".x-cwx{position:absolute;top:6px;right:6px;z-index:5;width:28px;height:28px;border-radius:50%;border:2px solid #fff;background:rgba(0,0,0,.78);color:#fff;font:700 16px/1 sans-serif;cursor:pointer;padding:0;display:grid;place-items:center}" +
      ".x-cwx:hover,.x-cwx:focus-visible{background:var(--x-red,#e1251b);outline:none}";
    doc.head.appendChild(st);
    var sec = doc.createElement("div");
    sec.className = "x-block"; sec.id = "cw"; sec.hidden = true;
    sec.setAttribute("role", "region"); sec.setAttribute("aria-label", "Continue Watching");
    sec.innerHTML = '<div class="x-shead"><div class="x-shead__row"><h2 class="x-h2">Continue Watching</h2></div>' +
      '<p class="x-sub">Pick up where you left off.</p><span class="x-stripe" aria-hidden="true"></span></div><div class="x-rail" id="rail-cw"></div>';
    var home = doc.getElementById("view-home"), car = home && home.querySelector(".x-carousel");
    if (!home) return;
    if (car && car.parentNode === home) home.insertBefore(sec, car.nextSibling); else home.insertBefore(sec, home.firstChild);
  })();
  function drawCW() {
    var sec = doc.getElementById("cw"), rail = doc.getElementById("rail-cw");
    if (!sec || !rail) return;
    CW_LIST = cwLoad().filter(function (x) { return x && x.id && IDX[x.id]; });
    CTX.cw = CW_LIST.map(function (x) { return IDX[x.id]; });
    sec.hidden = !CW_LIST.length;
    rail.innerHTML = CW_LIST.map(function (x, i) {
      var d = IDX[x.id], durS = x.dur || (d.mins ? d.mins * 60 : 0), pct = x.prog && durS ? Math.max(2, Math.min(100, Math.round(x.prog / durS * 100))) : 0;
      var html = card(d, "cw", i, { rail: true });
      if (pct) html = html.replace('</span><span class="x-card__body">', '<span class="x-cwbar" aria-hidden="true"><span style="width:' + pct + '%"></span></span></span><span class="x-card__body">');
      return '<div class="x-cw">' + html + '<button class="x-cwx" type="button" data-cwx="' + esc(x.id) + '" aria-label="' + esc("Remove " + d.title + " from Continue Watching") + '" title="Remove">×</button></div>';
    }).join("");
  }
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-cwx]");
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    cwRemove(b.getAttribute("data-cwx")); drawCW();
  }, true);
  var cwStop = function () {};
  function cwWatch(f, id) {
    var cwT = -1, cwD = 0, heard = false, saved = -1;
    function ping() { try { f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"); } catch (x) {} }
    function onMsg(ev) {
      if (!f.contentWindow || ev.source !== f.contentWindow) return;
      if (!/(^|\.)youtube(-nocookie)?\.com$/.test(String(ev.origin).replace(/^https?:\/\//, "").replace(/:\d+$/, ""))) return;
      var m = ev.data; if (typeof m === "string") { try { m = JSON.parse(m); } catch (x) { return; } }
      if (!m || !m.info) return; heard = true;
      if (typeof m.info.currentTime === "number") cwT = m.info.currentTime;
      if (typeof m.info.duration === "number" && m.info.duration > 0) cwD = m.info.duration;
    }
    function flush() { if (cwT >= 0 && Math.round(cwT) !== saved) { saved = Math.round(cwT); cwProgress(id, cwT, cwD); } }
    function onHide() { if (doc.visibilityState === "hidden") flush(); }
    window.addEventListener("message", onMsg);
    f.addEventListener("load", ping);
    var pingT = setInterval(function () { if (!heard) ping(); }, 2000), saveT = setInterval(flush, 15000);
    doc.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return function () { flush(); clearInterval(pingT); clearInterval(saveT); window.removeEventListener("message", onMsg); doc.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", flush); };
  }

  /* ---------- player sheet ---------- */
  var sheet = doc.getElementById("sheet"), stage = doc.getElementById("stage"), page = doc.getElementById("top"), lastFocus = null;
  function openPlayer(ctx, pos, from) {
    if (ctx === "cw") {
      var cx = CW_LIST[pos], ol = cx && cx.ctx && CTX[cx.ctx];
      if (cx && ol && ol[cx.pos] && ol[cx.pos].id === cx.id) { ctx = cx.ctx; pos = cx.pos; }
    }
    var list = CTX[ctx], d = list && list[pos];
    if (!d) return;
    if (sheet.hidden) lastFocus = from || doc.activeElement;
    try { cwStop(); } catch (x) {}
    cwStop = function () {};
    try { cwRecord(d, ctx, pos); } catch (x) {}
    var cwFrom = 0, cwOrigin = "";
    try { cwFrom = cwStart(d.id); cwOrigin = /^https?:/.test(location.origin || "") ? location.origin : ""; } catch (x) {}
    stage.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(d.id) + '?autoplay=1&playsinline=1&rel=0&enablejsapi=1' +
      (cwOrigin ? "&origin=" + encodeURIComponent(cwOrigin) : "") + (cwFrom ? "&start=" + cwFrom : "") + '" title="' + esc(d.title) +
      '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    try { var cwF = stage.querySelector("iframe"); if (cwF) cwStop = cwWatch(cwF, d.id); } catch (x) {}
    var t = disp(d);
    doc.getElementById("sheet-kicker").textContent = t.kicker;
    doc.getElementById("sheet-title").textContent = d.title;
    doc.getElementById("sheet-meta").textContent = [when(d), dur(d)].filter(Boolean).join(" · ");
    doc.getElementById("sheet-yt").href = watchUrl(d.id);
    var head = doc.getElementById("next-head"), box = doc.getElementById("next-list");
    if (ctx.indexOf("ep-") === 0) {
      head.textContent = "Up next · this night's " + plural(list.length, "clip");
      box.className = "x-grid";
      box.innerHTML = list.map(function (c, i) { return card(c, ctx, i, { rail: true, kicker: false, playing: i === pos, pin: i === pos ? "Now playing" : String(i + 1) }); }).join("");
    } else if (ctx === "xdiv") {
      doc.getElementById("sheet-kicker").textContent = "X-Division Playlist · " + (pos + 1) + " of " + list.length + " · " + d.ch;
      if (d._live) doc.getElementById("sheet-meta").textContent = [when(d), d._live].filter(Boolean).join(" · ");
      var rest = list.slice(pos + 1);
      head.hidden = false;
      head.textContent = rest.length ? "Up next · " + (pos + 1) + " of " + list.length + " in the X-Division playlist" : (pos + 1) + " of " + list.length + " · end of the playlist";
      box.className = "x-rail";
      box.innerHTML = rest.map(function (c, i) { return card(c, ctx, pos + 1 + i, { rail: true, pin: String(pos + 2 + i), pinY: true }); }).join("");
    } else if (ctx === "lib" || ctx === "search") {
      var after = [];
      for (var k = pos + 1; k < list.length && after.length < 12; k++) after.push(k);
      head.textContent = "Up next";
      head.hidden = !after.length;
      box.className = "x-rail";
      box.innerHTML = after.map(function (j) { return card(list[j], ctx, j, { rail: true }); }).join("");
    } else {
      var next = [];
      for (var i = 1; i < list.length && next.length < 12; i++) next.push((pos + i) % list.length);
      head.textContent = "Up next";
      head.hidden = !next.length;
      box.className = "x-rail";
      box.innerHTML = next.map(function (j) { return card(list[j], ctx, j, { rail: true }); }).join("");
    }
    if (sheet.hidden) {
      sheet.hidden = false;
      page.inert = true;
      doc.documentElement.style.overflow = "hidden";
      doc.getElementById("sheet-close").focus();
    }
    doc.getElementById("sheet-scroll").scrollTop = 0;
  }
  function closePlayer() {
    if (sheet.hidden) return;
    try { cwStop(); } catch (x) {}
    cwStop = function () {};
    sheet.hidden = true;
    stage.innerHTML = "";
    try { drawCW(); } catch (x) {}
    page.inert = false;
    doc.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus && doc.contains(lastFocus)) lastFocus.focus();
  }
  doc.getElementById("sheet-close").addEventListener("click", closePlayer);
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) closePlayer(); });

  /* ---------- navigation ---------- */
  var VIEWS = ["home", "impact", "xplosion", "ppv", "asylum", "more", "library", "xdiv"], current = "home";
  var TAB_OF = { library: "more", xdiv: "home" };
  function show(name, jump) {
    if (VIEWS.indexOf(name) < 0) name = "home";
    closeSearch(true);
    current = name;
    if (name === "library" && libDirty) renderLib();
    VIEWS.forEach(function (v) { doc.getElementById("view-" + v).hidden = v !== name; });
    var tab = TAB_OF[name] || name;
    [].slice.call(doc.querySelectorAll(".x-tab")).forEach(function (t) {
      if (t.getAttribute("data-go") === tab) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
    });
    try { history.replaceState(null, "", "#" + name); } catch (e) { /* sandboxed frame: the view still switches */ }
    var target = jump && doc.getElementById(jump);
    if (target) target.scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
  }
  doc.addEventListener("click", function (e) {
    var c = e.target.closest("[data-ctx]");
    if (c) { e.preventDefault(); openPlayer(c.getAttribute("data-ctx"), Number(c.getAttribute("data-pos")), c); return; }
    var go = e.target.closest("[data-go]");
    if (go) {
      e.preventDefault();
      var lc = go.getAttribute("data-lib");
      if (lc && (lc !== libCat || CTX.lib === undefined)) { libCat = lc; libDirty = true; }
      show(go.getAttribute("data-go"), go.getAttribute("data-jumpto")); return; }
    var j = e.target.closest("[data-jump]");
    if (j) { var t = doc.getElementById(j.getAttribute("data-jump")); if (t) t.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }); }
  });

  /* ---------- search: every show, event and clip ---------- */
  var sBtn = doc.getElementById("search-btn"), sRow = doc.getElementById("search-row"), sInput = doc.getElementById("search-input"), sView = doc.getElementById("view-search");
  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
  var seen = {};
  CAT.concat(CLIPS, LIB).forEach(function (d) { seen[d.id] = 1; });
  var ALL = CAT.concat(CLIPS, LIB, XD.filter(function (d) { return !seen[d.id]; }));
  ALL.forEach(function (d) {
    var tag = d._k === "lib" ? "library " + d.c : d._k === "xdiv" ? "x division playlist " + d.ch : (d.show || "impact clip");
    d._q = norm(d.title + " " + (d.event || "") + " " + (d.year || "") + " " + (d.date ? fmtDate(d.date) : "") + " " + tag + " " + (d.era || ""));
  });
  var MAX = 240;
  function runSearch() {
    var q = norm(sInput.value);
    if (!q) { sView.hidden = true; doc.getElementById("view-" + current).hidden = false; return; }
    var words = q.split(" ");
    var hits = ALL.filter(function (d) { return words.every(function (w) { return d._q.indexOf(w) >= 0; }); }).sort(newestFirst);
    VIEWS.forEach(function (v) { doc.getElementById("view-" + v).hidden = true; });
    sView.hidden = false;
    var clipsN = hits.filter(function (d) { return d._k === "clip"; }).length, libN = hits.filter(function (d) { return d._k === "lib" || d._k === "xdiv"; }).length;
    doc.getElementById("search-count").innerHTML = "<b>" + hits.length.toLocaleString("en-US") + "</b> " + (hits.length === 1 ? "result" : "results") + " for “" + esc(sInput.value.trim()) + "”" +
      (hits.length ? " · " + plural(hits.length - clipsN - libN, "show") + ", " + plural(clipsN, "clip") + ", " + libN.toLocaleString("en-US") + " from the library" : "") +
      (hits.length > MAX ? " · showing the newest " + MAX : "");
    doc.getElementById("search-list").innerHTML = hits.length ? cards(hits.slice(0, MAX), "search", { small: true }) : '<p class="x-empty">Nothing matches. Try a wrestler, event or year.</p>';
  }
  function openSearch() { sRow.hidden = false; sBtn.setAttribute("aria-expanded", "true"); sInput.focus(); if (sInput.value) runSearch(); }
  function closeSearch(silent) {
    sRow.hidden = true; sBtn.setAttribute("aria-expanded", "false"); sInput.value = "";
    sView.hidden = true;
    if (!silent) { doc.getElementById("view-" + current).hidden = false; sBtn.focus(); }
  }
  sBtn.addEventListener("click", function () { if (sRow.hidden) openSearch(); else closeSearch(); });
  doc.getElementById("search-clear").addEventListener("click", function () { closeSearch(); });
  sInput.addEventListener("input", runSearch);
  sInput.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSearch(); });

  drawCW();
  var start = (location.hash || "").replace("#", "");
  show(VIEWS.indexOf(start) >= 0 ? start : "home");
  window.TNA_TOTAL = { catalog: CAT.length, clips: CLIPS.length, library: LIB.length, xdiv: XD.length, episodes: EPS.length, total: CAT.length + CLIPS.length + LIB.length };
})();
