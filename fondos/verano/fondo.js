/*
 * Atardecer de verano · Fondos Dinámicos (MIT)
 * - Pompas de jabón que suben; el ratón las empuja y un clic las revienta.
 * - Al pasar el ratón por el mar se forman ondas; clic en el agua: chapoteo.
 * - Clic en una gaviota: aletea y sube. Clic en el cielo: más pompas.
 */
(function () {
  'use strict';
  var F = window.FondosDinamicos;
  var TAU = Math.PI * 2;

  var POMPA = F.sprite(128, function (ctx, t) {
    var c = t / 2, r = t / 2 - 3;
    var relleno = ctx.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.1, c, c, r);
    relleno.addColorStop(0, 'rgba(255,255,255,0.10)');
    relleno.addColorStop(0.8, 'rgba(255,220,240,0.06)');
    relleno.addColorStop(1, 'rgba(200,240,255,0.28)');
    ctx.fillStyle = relleno;
    ctx.beginPath(); ctx.arc(c, c, r, 0, TAU); ctx.fill();
    var borde = ctx.createLinearGradient(0, 0, t, t);
    borde.addColorStop(0, 'rgba(255,170,220,0.9)');
    borde.addColorStop(0.35, 'rgba(170,240,255,0.9)');
    borde.addColorStop(0.7, 'rgba(255,240,160,0.9)');
    borde.addColorStop(1, 'rgba(200,170,255,0.9)');
    ctx.strokeStyle = borde; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(c, c, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(c, c, r * 0.72, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(c + r * 0.45, c + r * 0.4, 3, 0, TAU); ctx.fill();
  });
  var BRILLO_SOL = F.brillo('#ffe2a8', 64);

  var e = null;
  var pompas = [], gaviotas = [], ondas = [], gotas = [], estelas = [];
  var hY = 0, sol = { x: 0, y: 0, r: 0 };
  var ultimaEstela = 0;

  F.crearFondo({
    capas: ['fondo', 'agua', 'frente', 'fx'],
    opaca: 'fondo',
    ajustes: { pompas: 50, fuerzaCursor: 60, gaviotas: true, fps: 30 },
    alRedimensionar: preparar,
    dibujarFondo: pintarFondo,
    estaticas: { frente: pintarFrente },
    dibujar: dibujar,
    alTocar: tocar,
    alCambiarAjuste: function (n) { if (n === 'pompas' || n === 'reducido') ajustarPompas(); }
  });

  function preparar(estado) {
    e = estado;
    var W = e.ancho, H = e.alto, u = e.u;
    hY = H * 0.6;
    sol.r = 78 * u;
    sol.x = W * 0.6;
    sol.y = hY - sol.r * 0.3;
    gaviotas = [];
    for (var i = 0; i < 4; i++) {
      gaviotas.push({
        x: Math.random() * W, y: H * (0.12 + Math.random() * 0.3), vel: (30 + Math.random() * 30) * u,
        esc: (0.9 + Math.random() * 0.7) * u, fase: Math.random() * TAU, aleteo: 5 + Math.random() * 2, prisa: 0
      });
    }
    ajustarPompas(true);
  }

  function nuevaPompa(W, H, u, x, y) {
    var r = (14 + Math.random() * 34) * u;
    return {
      x: x !== undefined ? x : Math.random() * W,
      y: y !== undefined ? y : H + r + Math.random() * H,
      r: r, vy: -(18 + Math.random() * 30) * u, px: 0, py: 0,
      fase: Math.random() * TAU, vida: 0, maxVida: 14 + Math.random() * 20
    };
  }

  function ajustarPompas(reiniciar) {
    var W = e.ancho, H = e.alto, u = e.u;
    var objetivo = Math.round(28 * (F.limitar(Number(e.ajustes.pompas), 0, 100) / 50) * (e.reducido ? 0.4 : 1));
    if (reiniciar) {
      pompas = [];
      while (pompas.length < objetivo) pompas.push(nuevaPompa(W, H, u, undefined, Math.random() * H * 1.2));
    }
    while (pompas.length < objetivo) pompas.push(nuevaPompa(W, H, u));
    if (pompas.length > objetivo + 12) pompas.length = objetivo + 12;
  }

  // ---------- Paisaje fijo ----------
  function pintarFondo(ctx, e) {
    var W = e.ancho, H = e.alto, u = e.u;
    var rnd = F.semilla(721);

    var cielo = ctx.createLinearGradient(0, 0, 0, hY);
    cielo.addColorStop(0, '#2a1b4d');
    cielo.addColorStop(0.35, '#6b2f6e');
    cielo.addColorStop(0.65, '#d4567a');
    cielo.addColorStop(0.88, '#ff9a5a');
    cielo.addColorStop(1, '#ffd27e');
    ctx.fillStyle = cielo;
    ctx.fillRect(0, 0, W, hY + 1);

    // primeras estrellas arriba
    for (var s = 0; s < 70; s++) {
      ctx.globalAlpha = 0.15 + rnd() * 0.4;
      ctx.fillStyle = '#fff';
      ctx.fillRect(rnd() * W, rnd() * hY * 0.3, 1.4 * u, 1.4 * u);
    }
    ctx.globalAlpha = 1;

    // resplandor del sol
    var halo = ctx.createRadialGradient(sol.x, sol.y, sol.r, sol.x, sol.y, sol.r * 9);
    halo.addColorStop(0, 'rgba(255,214,140,0.65)');
    halo.addColorStop(0.4, 'rgba(255,150,110,0.22)');
    halo.addColorStop(1, 'rgba(255,120,120,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, hY);
    var disco = ctx.createLinearGradient(0, sol.y - sol.r, 0, sol.y + sol.r);
    disco.addColorStop(0, '#fff3c4'); disco.addColorStop(1, '#ffb347');
    ctx.fillStyle = disco;
    ctx.beginPath(); ctx.arc(sol.x, sol.y, sol.r, 0, TAU); ctx.fill();

    // nubes alargadas
    for (var n = 0; n < 9; n++) {
      var nx = rnd() * W, ny = hY * (0.25 + rnd() * 0.6), nw = (160 + rnd() * 320) * u, nh = (8 + rnd() * 12) * u;
      var cerca = ny > hY * 0.6;
      ctx.fillStyle = cerca ? 'rgba(255,170,140,0.35)' : 'rgba(170,90,150,0.35)';
      for (var b = 0; b < 4; b++) {
        ctx.beginPath();
        ctx.ellipse(nx + (rnd() - 0.5) * nw * 0.6, ny + (rnd() - 0.5) * nh, nw * (0.3 + rnd() * 0.3), nh, 0, 0, TAU);
        ctx.fill();
      }
    }

    // isla lejana
    ctx.fillStyle = '#5a2e5e';
    ctx.beginPath();
    ctx.moveTo(W * 0.04, hY + 1);
    ctx.bezierCurveTo(W * 0.1, hY - 40 * u, W * 0.16, hY - 55 * u, W * 0.22, hY - 22 * u);
    ctx.bezierCurveTo(W * 0.26, hY - 30 * u, W * 0.3, hY - 12 * u, W * 0.34, hY + 1);
    ctx.fill();

    // mar
    var mar = ctx.createLinearGradient(0, hY, 0, H);
    mar.addColorStop(0, '#e9877f');
    mar.addColorStop(0.18, '#9a4f7a');
    mar.addColorStop(0.6, '#3b2b5e');
    mar.addColorStop(1, '#1d1b3f');
    ctx.fillStyle = mar;
    ctx.fillRect(0, hY, W, H - hY);

  }

  // Primer plano fijo (por delante del agua animada)
  function pintarFrente(ctx, e) {
    var W = e.ancho, H = e.alto, u = e.u;
    ctx.fillStyle = '#2a1733';
    ctx.beginPath();
    ctx.moveTo(W * 0.55, H + 2);
    ctx.bezierCurveTo(W * 0.7, H * 0.95, W * 0.82, H * 0.88, W + 2, H * 0.84);
    ctx.lineTo(W + 2, H + 2);
    ctx.fill();
    palmera(ctx, W * 0.86, H * 0.9, H * 0.5, -0.12, u);
    palmera(ctx, W * 0.95, H * 0.87, H * 0.36, 0.1, u);
  }

  function palmera(ctx, x, y, alto, inclina, u) {
    var cx = x + alto * inclina * 1.6, cy = y - alto;
    ctx.strokeStyle = '#2a1733';
    ctx.lineCap = 'round';
    ctx.lineWidth = 14 * u;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + alto * inclina * 0.2, y - alto * 0.5, cx, cy);
    ctx.stroke();
    ctx.fillStyle = '#2a1733';
    for (var i = 0; i < 9; i++) {
      var lado = (i - 4) / 4; // -1 izquierda … 1 derecha
      var ang = -Math.PI / 2 + lado * 1.45 + inclina;
      var largo = alto * (0.38 + (i % 2) * 0.07);
      var caida = largo * (0.15 + 0.55 * Math.abs(lado));
      var ex = cx + Math.cos(ang) * largo, ey = cy + Math.sin(ang) * largo * 0.45 + caida;
      var mx = cx + Math.cos(ang) * largo * 0.55, my = cy + Math.sin(ang) * largo * 0.55 - largo * 0.08;
      var nx = -Math.sin(ang), ny = Math.cos(ang);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(mx - nx * 16 * u, my - ny * 16 * u, ex, ey);
      ctx.quadraticCurveTo(mx + nx * 6 * u, my + ny * 6 * u, cx, cy);
      ctx.fill();
      // foliolos
      ctx.lineWidth = 2.2 * u;
      ctx.beginPath();
      for (var f = 1; f < 9; f++) {
        var tt = f / 9, it = 1 - tt;
        var bx = it * it * cx + 2 * it * tt * (mx - nx * 10 * u) + tt * tt * ex;
        var by = it * it * cy + 2 * it * tt * (my - ny * 10 * u) + tt * tt * ey;
        var lf = largo * 0.16 * Math.sin(tt * Math.PI);
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + nx * lf * 0.4 + Math.cos(ang) * lf * 0.3, by + lf * 0.9);
      }
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx, cy + 6 * u, 9 * u, 0, TAU); ctx.fill();
  }

  // ---------- Interacción ----------
  function tocar(x, y, e) {
    var u = e.u;
    for (var i = pompas.length - 1; i >= 0; i--) {
      var p = pompas[i];
      if ((x - p.x) * (x - p.x) + (y - p.y) * (y - p.y) < (p.r + 8 * u) * (p.r + 8 * u)) { reventar(i); return; }
    }
    for (var g = 0; g < gaviotas.length; g++) {
      var ga = gaviotas[g];
      if (Math.abs(x - ga.x) < 40 * ga.esc && Math.abs(y - ga.y) < 26 * ga.esc) { ga.prisa = 1; return; }
    }
    if (y > hY) {
      ondas.push({ x: x, y: y, r: 0, vida: 1, fuerte: true });
      for (var k = 0; k < (e.reducido ? 5 : 14); k++) {
        var a = -Math.PI * (0.15 + Math.random() * 0.7);
        var v = (120 + Math.random() * 220) * u;
        gotas.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, suelo: y, vida: 1 });
      }
    } else {
      for (var j = 0; j < 4; j++) {
        var nueva = nuevaPompa(e.ancho, e.alto, u, x + (Math.random() - 0.5) * 60 * u, y + (Math.random() - 0.5) * 60 * u);
        nueva.py = -60 * u * Math.random();
        pompas.push(nueva);
      }
    }
  }

  function reventar(i) {
    var p = pompas[i], u = e.u;
    for (var k = 0; k < 10; k++) {
      var a = Math.random() * TAU, v = (60 + Math.random() * 120) * u;
      gotas.push({ x: p.x + Math.cos(a) * p.r, y: p.y + Math.sin(a) * p.r, vx: Math.cos(a) * v, vy: Math.sin(a) * v, suelo: e.alto * 2, vida: 0.6 });
    }
    ondas.push({ x: p.x, y: p.y, r: p.r, vida: 0.6, aire: true });
    pompas.splice(i, 1);
  }

  // ---------- Animación ----------
  function dibujar(e, dt) {
    var ctx = e.capas.agua.ctx, W = e.ancho, H = e.alto, u = e.u, t = e.t, pt = e.puntero;
    var lento = e.reducido ? 0.3 : 1;
    ctx.clearRect(0, 0, W, H);

    // reflejo del sol en el agua
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#ffd59a';
    var fila = 0;
    for (var y = hY + 2 * u; y < H * 0.95; y += 5 * u + (y - hY) * 0.035, fila++) {
      var prof = (y - hY) / (H - hY);
      var semi = sol.r * (0.7 + prof * 2.4);
      ctx.globalAlpha = (1 - prof) * 0.55;
      for (var j = 0; j < 3; j++) {
        var off = Math.sin(t * 1.1 * lento + fila * 1.7 + j * 2.1) * semi;
        var largo = (18 + 30 * Math.abs(Math.sin(fila * 3.1 + j + t * 0.7 * lento))) * u * (0.6 + prof);
        ctx.fillRect(sol.x + off - largo / 2, y, largo, (1.4 + prof * 2.5) * u);
      }
    }
    // líneas de oleaje
    ctx.fillStyle = '#ffc7b0';
    for (var k = 0; k < 18; k++) {
      var pr = ((k / 18) + t * 0.012 * lento) % 1;
      var yy = hY + (H - hY) * pr * pr;
      ctx.globalAlpha = 0.05 + pr * 0.05;
      var desp = Math.sin(k * 7.3) * W * 0.3 + t * 8 * u * lento;
      for (var m = 0; m < 4; m++) {
        var xl = ((desp + m * W * 0.31) % (W * 1.2)) - W * 0.1;
        ctx.fillRect(xl, yy, (80 + pr * 200) * u, (1 + pr * 2) * u);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // estela del ratón sobre el agua
    if (pt.activo && pt.y > hY + 6 * u && (Math.abs(pt.vx) + Math.abs(pt.vy)) > 60 * u && e.t - ultimaEstela > 0.12) {
      ultimaEstela = e.t;
      ondas.push({ x: pt.x, y: pt.y, r: 2 * u, vida: 0.7 });
    }

    // ondas (en el agua son elipses por la perspectiva)
    for (var o = ondas.length - 1; o >= 0; o--) {
      var on = ondas[o];
      on.r += (on.aire ? 160 : on.fuerte ? 140 : 70) * u * dt;
      on.vida -= dt * (on.aire ? 2.4 : 0.7);
      if (on.vida <= 0) { ondas.splice(o, 1); continue; }
      ctx.strokeStyle = 'rgba(255,225,200,' + (on.vida * (on.aire ? 0.5 : 0.4)).toFixed(3) + ')';
      ctx.lineWidth = 1.6 * u;
      ctx.beginPath();
      var aplana = on.aire ? 1 : 0.22 + 0.25 * ((on.y - hY) / (H - hY));
      ctx.ellipse(on.x, on.y, on.r, on.r * aplana, 0, 0, TAU);
      if (on.fuerte) ctx.ellipse(on.x, on.y, on.r * 0.6, on.r * 0.6 * aplana, 0, 0, TAU);
      ctx.stroke();
    }

    // a partir de aquí, por delante de la orilla
    ctx = e.capas.fx.ctx;
    ctx.clearRect(0, 0, W, H);

    // gaviotas
    if (e.ajustes.gaviotas !== false) {
      ctx.strokeStyle = '#2a1733';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (var g = 0; g < gaviotas.length; g++) {
        var ga = gaviotas[g];
        ga.prisa = Math.max(0, ga.prisa - dt * 0.4);
        ga.fase += dt * (ga.aleteo + ga.prisa * 10) * lento;
        ga.x += ga.vel * (1 + ga.prisa * 2) * dt * lento;
        ga.y += (Math.sin(t * 0.5 + g) * 6 * u - ga.prisa * 60 * u) * dt * lento;
        if (ga.x > W + 60 * u) { ga.x = -60 * u; ga.y = H * (0.12 + Math.random() * 0.3); }
        if (ga.y < 20 * u) ga.y = 20 * u;
        var al = Math.sin(ga.fase) * 10 * ga.esc, s = ga.esc;
        ctx.lineWidth = 2.6 * s;
        ctx.beginPath();
        ctx.moveTo(ga.x - 24 * s, ga.y - 4 * s + al);
        ctx.quadraticCurveTo(ga.x - 12 * s, ga.y - 10 * s + al * 0.6, ga.x, ga.y);
        ctx.quadraticCurveTo(ga.x + 12 * s, ga.y - 10 * s + al * 0.6, ga.x + 24 * s, ga.y - 4 * s + al);
        ctx.stroke();
      }
    }

    // pompas
    var fuerza = F.limitar(Number(e.ajustes.fuerzaCursor), 0, 100) / 60;
    var R = 170 * u;
    var amort = Math.pow(0.25, dt);
    for (var i = pompas.length - 1; i >= 0; i--) {
      var p = pompas[i];
      p.vida += dt;
      p.fase += dt * 1.3;
      if (pt.activo && fuerza > 0) {
        var dx = p.x - pt.x, dy = p.y - pt.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        var alcance = R + p.r;
        if (d < alcance) {
          var kk = 1 - d / alcance;
          p.px += (dx / d) * kk * 900 * u * fuerza * dt + pt.vx * kk * 1.2 * dt;
          p.py += (dy / d) * kk * 900 * u * fuerza * dt + pt.vy * kk * 1.2 * dt;
        }
      }
      p.px *= amort; p.py *= amort;
      p.x += (Math.sin(p.fase) * 14 * u * lento + p.px) * dt;
      p.y += (p.vy * lento + p.py) * dt;
      if (p.y < -p.r * 2 || p.x < -p.r * 3 || p.x > W + p.r * 3) { pompas.splice(i, 1); continue; }
      if (p.vida > p.maxVida && p.y < H) { reventar(i); continue; }
      var deforma = 1 + Math.sin(p.fase * 2.3) * 0.04;
      ctx.drawImage(POMPA, p.x - p.r * deforma, p.y - p.r / deforma, p.r * 2 * deforma, p.r * 2 / deforma);
    }
    ajustarPompas(false);

    // gotas
    ctx.fillStyle = '#ffe6cf';
    for (var q = gotas.length - 1; q >= 0; q--) {
      var gt = gotas[q];
      gt.vy += 600 * u * dt;
      gt.x += gt.vx * dt; gt.y += gt.vy * dt;
      gt.vida -= dt * 1.2;
      if (gt.vida <= 0 || gt.y > gt.suelo + 4 * u) { gotas.splice(q, 1); continue; }
      ctx.globalAlpha = Math.min(1, gt.vida * 1.5);
      ctx.beginPath(); ctx.arc(gt.x, gt.y, 2 * u, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // brillo suave del sol que respira
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + 0.08 * Math.sin(t * 0.6);
    var ts = sol.r * 5;
    ctx.drawImage(BRILLO_SOL, sol.x - ts / 2, sol.y - ts / 2, ts, ts);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
})();
