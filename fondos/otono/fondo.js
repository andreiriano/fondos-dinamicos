/*
 * Bosque de otoño · Fondos Dinámicos (MIT)
 * - Hojas que caen girando; el ratón las sopla en la dirección en que lo mueves.
 * - Las hojas se quedan en el suelo; pasa el ratón deprisa por encima y vuelan.
 * - Clic en la copa del arce: lo sacudes y caen muchas hojas. Clic en otro sitio: ráfaga de viento.
 */
(function () {
  'use strict';
  var F = window.FondosDinamicos;
  var TAU = Math.PI * 2;

  var COLORES_HOJA = ['#e2432b', '#f07c22', '#f5b331', '#b8321f', '#d9662a', '#c9a227'];

  function hojaArce(ctx, t, color) {
    var c = t / 2, R = t * 0.44;
    ctx.translate(c, c);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i <= 200; i++) {
      var a = (i / 200) * TAU;
      // cinco lóbulos con dientes; un lóbulo apunta hacia arriba
      var lob = Math.pow(Math.abs(Math.cos((a + Math.PI / 2) * 2.5)), 0.6);
      var r = R * (0.42 + 0.58 * lob) * (1 + 0.07 * Math.sin(a * 25));
      if (a > Math.PI * 0.38 && a < Math.PI * 0.62) r *= 0.55; // hueco del tallo
      var x = Math.cos(a - Math.PI / 2) * r, y = Math.sin(a - Math.PI / 2) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,30,10,0.45)';
    ctx.lineWidth = t * 0.025;
    ctx.beginPath();
    for (var k = 0; k < 5; k++) {
      var b = -Math.PI / 2 + (k - 2) * 1.0;
      ctx.moveTo(0, R * 0.15);
      ctx.lineTo(Math.cos(b) * R * 0.75, Math.sin(b) * R * 0.75 + R * 0.15);
    }
    ctx.moveTo(0, R * 0.15); ctx.lineTo(0, R * 0.95);
    ctx.stroke();
  }

  function hojaOval(ctx, t, color) {
    var c = t / 2, L = t * 0.45, A = t * 0.2;
    ctx.translate(c, c);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -L);
    ctx.quadraticCurveTo(A * 1.6, -L * 0.1, 0, L * 0.8);
    ctx.quadraticCurveTo(-A * 1.6, -L * 0.1, 0, -L);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,30,10,0.45)';
    ctx.lineWidth = t * 0.025;
    ctx.beginPath(); ctx.moveTo(0, -L * 0.9); ctx.lineTo(0, L); ctx.stroke();
  }

  var SPRITES = [];
  COLORES_HOJA.forEach(function (col, i) {
    SPRITES.push(F.sprite(64, function (ctx, t) { (i % 3 === 2 ? hojaOval : hojaArce)(ctx, t, col); }));
  });

  var PALETA_COPA = [
    ['#7a1f14', '#a8311b', '#d4502a', '#f08a3c'],
    ['#7d2a10', '#b4471a', '#e0702a', '#f7a440'],
    ['#6e2412', '#9c3a17', '#cf5d24', '#f39a3f'],
    ['#7a3a10', '#b0661c', '#df9a2c', '#f8c552']
  ];

  var e = null;
  var hojas = [], copa = [], motas = [];
  var arce = { x: 0, y: 0, rx: 0, ry: 0 };
  var sol = { x: 0, y: 0 };
  var suelo = 0;

  F.crearFondo({
    capas: ['fondo', 'frente', 'fx'],
    opaca: 'fondo',
    ajustes: { hojas: 50, viento: 30, fuerzaCursor: 60, fps: 30 },
    alRedimensionar: preparar,
    dibujarFondo: pintarFondo,
    estaticas: { frente: pintarFrente },
    dibujar: dibujar,
    alTocar: tocar
  });

  function preparar(estado) {
    e = estado;
    var W = e.ancho, H = e.alto, u = e.u;
    suelo = H * 0.9;
    sol.x = W * 0.36; sol.y = H * 0.52;
    var vertical = H > W;
    arce.x = W * (vertical ? 0.75 : 0.83);
    arce.y = H * 0.2;
    arce.rx = Math.min(W * 0.26, H * 0.45);
    arce.ry = H * 0.27;
    // bolas de follaje de la copa (fijas; sirven también para soltar hojas)
    copa = [];
    var rnd = F.semilla(1310);
    for (var i = 0; i < 340; i++) {
      var a = rnd() * TAU, d = Math.sqrt(rnd());
      var x = arce.x + Math.cos(a) * d * arce.rx, y = arce.y + Math.sin(a) * d * arce.ry;
      var luz = F.limitar(0.5 - (x - arce.x) / arce.rx * 0.35 - (y - arce.y) / arce.ry * 0.25 + (rnd() - 0.5) * 0.3, 0, 1);
      copa.push({ x: x, y: y, r: (18 + rnd() * 26) * u, luz: luz, color: Math.floor(rnd() * 4) });
    }
    copa.sort(function (a, b) { return a.luz - b.luz; });
    if (hojas.length === 0) {
      var n = cuantasHojas();
      for (var h = 0; h < n; h++) hojas.push(nuevaHoja(true));
    }
  }

  function cuantasHojas() {
    return Math.round(70 * (F.limitar(Number(e.ajustes.hojas), 0, 100) / 50) * (e.reducido ? 0.35 : 1));
  }

  function nuevaHoja(repartida, x, y) {
    var W = e.ancho, H = e.alto, u = e.u;
    if (x === undefined) {
      if (Math.random() < 0.7 && copa.length) {
        var b = copa[Math.floor(Math.random() * copa.length)];
        x = b.x; y = b.y;
      } else {
        x = Math.random() * W; y = -30 * u;
      }
      if (repartida) y = Math.random() * H * 0.9;
    }
    return {
      x: x, y: y, vx: 0, vy: 0,
      tam: (22 + Math.random() * 18) * u,
      rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 3,
      giro: Math.random() * TAU, vgiro: 1.5 + Math.random() * 3,
      fase: Math.random() * TAU,
      caida: (38 + Math.random() * 34) * u,
      sprite: SPRITES[Math.floor(Math.random() * SPRITES.length)],
      enSuelo: false, sueloY: suelo + Math.random() * (e.alto - suelo) * 0.9, reposo: 0, alfa: 1
    };
  }

  // ---------- Paisaje ----------
  function pintarFondo(ctx, e) {
    var W = e.ancho, H = e.alto, u = e.u;
    var rnd = F.semilla(404);
    var cielo = ctx.createLinearGradient(0, 0, 0, H * 0.7);
    cielo.addColorStop(0, '#6f9cc4');
    cielo.addColorStop(0.45, '#c9b9a6');
    cielo.addColorStop(0.8, '#f4c27f');
    cielo.addColorStop(1, '#f39a52');
    ctx.fillStyle = cielo;
    ctx.fillRect(0, 0, W, H);

    var halo = ctx.createRadialGradient(sol.x, sol.y, 0, sol.x, sol.y, H * 0.7);
    halo.addColorStop(0, 'rgba(255,240,200,0.95)');
    halo.addColorStop(0.05, 'rgba(255,236,180,0.9)');
    halo.addColorStop(0.15, 'rgba(255,215,150,0.45)');
    halo.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    // colinas brumosas
    capaColinas(ctx, W, H, H * 0.6, H * 0.06, '#d39a78', rnd);
    capaArboles(ctx, W, H, H * 0.66, 28 * u, ['#c98a62', '#cf9a68', '#c4805d'], '#a8735a', rnd, 0.85);
    capaColinas(ctx, W, H, H * 0.7, H * 0.035, '#b8704c', rnd);
    capaArboles(ctx, W, H, H * 0.76, 42 * u, ['#d0602f', '#e08a35', '#c4472a', '#dca23a'], '#6b3a24', rnd, 1);

    // prado
    var prado = ctx.createLinearGradient(0, H * 0.74, 0, H);
    prado.addColorStop(0, '#a9672f'); prado.addColorStop(1, '#6e3d1d');
    ctx.fillStyle = prado;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.8);
    ctx.bezierCurveTo(W * 0.3, H * 0.76, W * 0.6, H * 0.79, W, H * 0.77);
    ctx.lineTo(W, H); ctx.lineTo(0, H);
    ctx.fill();
    // camino
    ctx.fillStyle = 'rgba(240,200,140,0.35)';
    ctx.beginPath();
    ctx.moveTo(W * 0.4, H * 0.79);
    ctx.bezierCurveTo(W * 0.45, H * 0.85, W * 0.25, H * 0.92, W * 0.2, H);
    ctx.lineTo(W * 0.42, H);
    ctx.bezierCurveTo(W * 0.45, H * 0.92, W * 0.52, H * 0.85, W * 0.43, H * 0.79);
    ctx.fill();
  }

  function capaColinas(ctx, W, H, y, amp, color, rnd) {
    var p1 = rnd() * TAU, p2 = rnd() * TAU;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W + 10; x += 10) {
      ctx.lineTo(x, y - amp * (0.6 * Math.sin(x / W * 5 + p1) + 0.4 * Math.sin(x / W * 11 + p2)));
    }
    ctx.lineTo(W, H);
    ctx.fill();
  }

  function capaArboles(ctx, W, H, y, tam, colores, tronco, rnd, alfa) {
    ctx.globalAlpha = alfa;
    for (var x = -tam; x < W + tam; x += tam * (0.7 + rnd() * 0.6)) {
      var h = tam * (1.6 + rnd() * 1.2), yb = y + rnd() * tam * 0.4;
      ctx.fillStyle = tronco;
      ctx.fillRect(x - tam * 0.06, yb - h * 0.5, tam * 0.12, h * 0.5);
      ctx.fillStyle = colores[Math.floor(rnd() * colores.length)];
      for (var b = 0; b < 4; b++) {
        ctx.beginPath();
        ctx.arc(x + (rnd() - 0.5) * tam * 0.7, yb - h * (0.55 + rnd() * 0.35), tam * (0.35 + rnd() * 0.25), 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }


  function pintarFrente(ctx, e) {
    var W = e.ancho, H = e.alto, u = e.u;
    // tronco y ramas del arce
    ctx.fillStyle = '#3d2216';
    ctx.strokeStyle = '#3d2216';
    ctx.lineCap = 'round';
    var bx = arce.x + arce.rx * 0.1;
    ctx.beginPath();
    ctx.moveTo(bx - 78 * u, H);
    ctx.bezierCurveTo(bx - 34 * u, H * 0.8, bx - 26 * u, H * 0.55, bx - 20 * u, arce.y + arce.ry * 0.4);
    ctx.lineTo(bx + 20 * u, arce.y + arce.ry * 0.4);
    ctx.bezierCurveTo(bx + 26 * u, H * 0.55, bx + 40 * u, H * 0.8, bx + 92 * u, H);
    ctx.fill();
    [[-0.7, -0.3, 16], [0.6, -0.4, 14], [-0.3, -0.8, 12], [0.25, -0.75, 11], [-0.9, 0.1, 10]].forEach(function (r) {
      ctx.lineWidth = r[2] * u;
      ctx.beginPath();
      ctx.moveTo(bx, arce.y + arce.ry * 0.55);
      ctx.quadraticCurveTo(bx + r[0] * arce.rx * 0.3, arce.y + r[1] * arce.ry * 0.2, bx + r[0] * arce.rx * 0.8, arce.y + r[1] * arce.ry * 0.7);
      ctx.stroke();
    });
    // copa: primero una sombra que rellena huecos, luego de las bolas más oscuras a las más iluminadas
    ctx.fillStyle = '#6a2312';
    ctx.beginPath(); ctx.ellipse(arce.x, arce.y + arce.ry * 0.05, arce.rx * 0.9, arce.ry * 0.88, 0, 0, TAU); ctx.fill();
    for (var i = 0; i < copa.length; i++) {
      var b = copa[i];
      var tono = PALETA_COPA[b.color][Math.min(3, Math.floor(b.luz * 4))];
      ctx.fillStyle = tono;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    }
    // hierba y hojarasca del primer plano
    var rnd = F.semilla(77);
    var g = ctx.createLinearGradient(0, suelo - 20 * u, 0, H);
    g.addColorStop(0, '#7a4a1e'); g.addColorStop(1, '#4a2a12');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W + 20; x += 20) ctx.lineTo(x, suelo + Math.sin(x * 0.01) * 6 * u + rnd() * 6 * u);
    ctx.lineTo(W, H);
    ctx.fill();
    for (var k = 0; k < 260; k++) {
      var s = SPRITES[Math.floor(rnd() * SPRITES.length)], t = (14 + rnd() * 16) * u;
      ctx.globalAlpha = 0.75 + rnd() * 0.25;
      ctx.save();
      ctx.translate(rnd() * W, suelo + 6 * u + rnd() * (H - suelo));
      ctx.rotate(rnd() * TAU);
      ctx.scale(1, 0.55);
      ctx.drawImage(s, -t / 2, -t / 2, t, t);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Interacción ----------
  function tocar(x, y, e) {
    var u = e.u;
    var dx = (x - arce.x) / arce.rx, dy = (y - arce.y) / arce.ry;
    if (dx * dx + dy * dy < 1.05) {
      var n = e.reducido ? 8 : 26;
      for (var i = 0; i < n; i++) {
        var h = nuevaHoja(false, x + (Math.random() - 0.5) * 160 * u, y + (Math.random() - 0.5) * 100 * u);
        h.vx = (Math.random() - 0.5) * 120 * u; h.vy = Math.random() * 60 * u;
        hojas.push(h);
      }
      return;
    }
    // ráfaga de viento desde el punto del clic
    for (var j = 0; j < hojas.length; j++) {
      var hj = hojas[j];
      var ox = hj.x - x, oy = hj.y - y, d = Math.sqrt(ox * ox + oy * oy) || 1;
      var R = 320 * u;
      if (d < R) {
        var k = (1 - d / R) * 700 * u;
        hj.vx += (ox / d) * k; hj.vy += (oy / d) * k - 200 * u * (1 - d / R);
        if (hj.enSuelo) { hj.enSuelo = false; hj.vrot = (Math.random() - 0.5) * 8; }
      }
    }
    for (var m = 0; m < 16; m++) {
      var a = Math.random() * TAU;
      motas.push({ x: x, y: y, vx: Math.cos(a) * 200 * u, vy: Math.sin(a) * 200 * u, vida: 1 });
    }
  }

  // ---------- Animación ----------
  function dibujar(e, dt) {
    var ctx = e.capas.fx.ctx, W = e.ancho, H = e.alto, u = e.u, t = e.t, p = e.puntero, esc = e.escala;
    var lento = e.reducido ? 0.35 : 1;
    ctx.clearRect(0, 0, W, H);

    // rayos de sol suaves
    if (!e.reducido) {
      ctx.globalCompositeOperation = 'lighter';
      for (var r = 0; r < 5; r++) {
        var ang = 0.35 + r * 0.17 + Math.sin(t * 0.07 + r) * 0.03;
        var alfa = 0.035 + 0.025 * Math.sin(t * 0.3 + r * 1.7);
        var largo = H * 1.2, ancho = 0.04;
        ctx.fillStyle = 'rgba(255,230,170,' + alfa.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(sol.x, sol.y);
        ctx.lineTo(sol.x + Math.cos(ang - ancho) * largo, sol.y + Math.sin(ang - ancho) * largo);
        ctx.lineTo(sol.x + Math.cos(ang + ancho) * largo, sol.y + Math.sin(ang + ancho) * largo);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    var objetivo = cuantasHojas();
    var cayendo = 0;
    for (var c = 0; c < hojas.length; c++) if (!hojas[c].enSuelo) cayendo++;
    if (cayendo < objetivo && Math.random() < dt * 6) hojas.push(nuevaHoja(false));

    var vientoBase = (F.limitar(Number(e.ajustes.viento), 0, 100) / 100) * 90 * u;
    var rafaga = vientoBase * (0.6 + 0.4 * Math.sin(t * 0.37) * Math.sin(t * 0.11 + 1));
    var fuerza = F.limitar(Number(e.ajustes.fuerzaCursor), 0, 100) / 60;
    var R = 190 * u, velP = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    var amort = Math.pow(0.3, dt);
    var enSuelo = 0;

    for (var i = hojas.length - 1; i >= 0; i--) {
      var h = hojas[i];
      if (p.activo && fuerza > 0 && velP > 30 * u) {
        var dx = h.x - p.x, dy = h.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          var k = 1 - Math.sqrt(d2) / R;
          h.vx += p.vx * k * 3.2 * fuerza * dt;
          h.vy += (p.vy * k * 3.2 - 160 * u * k) * fuerza * dt;
          if (h.enSuelo && velP > 300 * u) { h.enSuelo = false; h.vy -= 120 * u * k; h.vrot = (Math.random() - 0.5) * 8; }
        }
      }
      if (h.enSuelo) {
        enSuelo++;
        h.reposo += dt;
        if (h.reposo > 25) h.alfa -= dt * 0.25;
        if (h.alfa <= 0) { hojas.splice(i, 1); continue; }
      } else {
        h.fase += dt * 1.7;
        h.vx *= amort; h.vy *= amort;
        h.x += (h.vx + (rafaga + Math.sin(h.fase) * 30 * u) * lento) * dt;
        h.y += (h.vy + h.caida * (0.8 + 0.4 * Math.cos(h.fase * 2)) * lento) * dt;
        h.rot += h.vrot * dt * lento;
        h.giro += h.vgiro * dt * lento;
        if (h.y >= h.sueloY) {
          h.y = h.sueloY; h.enSuelo = true; h.reposo = 0; h.vx = h.vy = 0;
        }
        if (h.x > W + 60 * u) h.x = -50 * u;
        else if (h.x < -60 * u) h.x = W + 50 * u;
        if (h.y < -200 * u) h.y = -40 * u;
      }
      var flip = h.enSuelo ? 0.55 : Math.cos(h.giro);
      var cs = Math.cos(h.rot), sn = Math.sin(h.rot);
      ctx.globalAlpha = h.alfa;
      ctx.setTransform(esc * cs * flip, esc * sn * flip, -esc * sn, esc * cs, esc * h.x, esc * h.y);
      ctx.drawImage(h.sprite, -h.tam / 2, -h.tam / 2, h.tam, h.tam);
    }
    ctx.setTransform(esc, 0, 0, esc, 0, 0);
    ctx.globalAlpha = 1;
    // no acumular demasiadas en el suelo
    if (enSuelo > 140) {
      for (var q = 0; q < hojas.length && enSuelo > 140; q++) {
        if (hojas[q].enSuelo && hojas[q].reposo < 25) { hojas[q].reposo = 25; enSuelo--; }
      }
    }

    // motas de la ráfaga
    ctx.fillStyle = '#ffe2b0';
    for (var m = motas.length - 1; m >= 0; m--) {
      var mo = motas[m];
      mo.vida -= dt * 1.5;
      if (mo.vida <= 0) { motas.splice(m, 1); continue; }
      mo.x += mo.vx * dt; mo.y += mo.vy * dt;
      mo.vx *= Math.pow(0.1, dt); mo.vy *= Math.pow(0.1, dt);
      ctx.globalAlpha = mo.vida * 0.8;
      ctx.beginPath(); ctx.arc(mo.x, mo.y, 2 * u, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
})();
