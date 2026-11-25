/*
 * Navidad nevada · Fondos Dinámicos (MIT)
 * - La nieve se aparta del cursor y sigue el movimiento del ratón.
 * - Guirnalda de bombillas arriba: se balancean al pasar el ratón; al tocarlas, destellan.
 * - Toca el árbol para cambiar el juego de luces; toca los regalos para abrirlos.
 * - Clic en cualquier otro sitio: una ráfaga de nieve.
 */
(function () {
  'use strict';
  var F = window.FondosDinamicos;
  var TAU = Math.PI * 2;

  var COLORES = ['#ff4545', '#ffd23f', '#3fe07a', '#3fb2ff', '#ff6ee0'];
  var BRILLOS = COLORES.map(function (c) { return F.brillo(c, 64); });
  var BRILLO_CALIDO = F.brillo('#ffd9a0', 64);
  var BRILLO_BLANCO = F.brillo('#ffffff', 64);
  var BRILLO_ESTRELLA = F.brillo('#fff2b0', 128);

  var nieve = [], guirnaldas = [], bombillas = [], lucesArbol = [], regalos = [];
  var chispas = [], ondas = [], titilantes = [];
  var arbol = { x: 0, cima: 0, baseCopa: 0, ancho: 0, destello: 0 };

  var e = F.crearFondo({
    capas: ['fondo', 'fx'],
    opaca: 'fondo',
    ajustes: { nieve: 60, fuerzaCursor: 60, patronLuces: 0, fps: 30 },
    alRedimensionar: preparar,
    dibujarFondo: pintarFondo,
    dibujar: dibujar,
    alTocar: tocar,
    alCambiarAjuste: function (nombre) {
      if (nombre === 'nieve' || nombre === 'reducido') ajustarNieve();
    }
  });

  // ---------- Preparación (se repite al cambiar el tamaño de la pantalla) ----------
  function preparar(estado) {
    e = estado; // se llama antes de que crearFondo termine
    var W = e.ancho, H = e.alto, u = e.u;
    var vertical = H > W;

    arbol.x = W * (vertical ? 0.68 : 0.8);
    arbol.base = H * 0.9;
    var alto = H * (vertical ? 0.42 : 0.56);
    arbol.cima = arbol.base - alto;
    arbol.baseCopa = arbol.base - alto * 0.1;
    arbol.ancho = Math.min(alto * 0.66, W * 0.42);

    // Guirnaldas colgando del borde superior
    guirnaldas = []; bombillas = [];
    var tramos = Math.max(2, Math.round(W / (720 * u)));
    var anchoTramo = (W * 1.04) / tramos;
    for (var g = 0; g < tramos; g++) {
      var x0 = -W * 0.02 + g * anchoTramo;
      var tramo = { x0: x0, x1: x0 + anchoTramo, y: -6 * u, caida: H * 0.075 + (g % 2) * H * 0.012 };
      guirnaldas.push(tramo);
      var n = Math.max(5, Math.round(anchoTramo / (68 * u)));
      for (var i = 0; i < n; i++) {
        var t = (i + 0.5) / n;
        var px = F.mezclar(tramo.x0, tramo.x1, t);
        var py = tramo.y + tramo.caida * (1 - Math.pow(2 * t - 1, 2));
        bombillas.push({
          ax: px, ay: py, ang: F.azar(-0.1, 0.1), vel: 0, largo: 16 * u,
          color: (bombillas.length) % COLORES.length, destello: 0, fase: Math.random() * TAU, i: bombillas.length
        });
      }
    }

    // Luces del árbol, en filas curvas
    lucesArbol = [];
    var altoCopa = arbol.baseCopa - arbol.cima;
    var filas = 7;
    for (var f = 1; f <= filas; f++) {
      var yf = arbol.cima + altoCopa * (f / (filas + 0.6));
      var semi = ((yf - arbol.cima) / altoCopa) * arbol.ancho * 0.45;
      var cuantas = Math.max(3, Math.round((semi * 2) / (30 * u)));
      for (var k = 0; k < cuantas; k++) {
        var s = (k + 0.5) / cuantas;
        lucesArbol.push({
          x: arbol.x - semi + semi * 2 * s,
          y: yf + Math.sin(s * Math.PI) * altoCopa * 0.035 - (s - 0.5) * altoCopa * 0.05,
          color: (f + k) % COLORES.length, fase: Math.random() * TAU, i: lucesArbol.length
        });
      }
    }

    // Regalos
    var a = arbol.ancho, b = arbol.base;
    regalos = [
      { x: arbol.x - a * 0.5, w: 74 * u, h: 58 * u, color: '#d6303f', cinta: '#ffd95a' },
      { x: arbol.x - a * 0.16, w: 56 * u, h: 72 * u, color: '#2f7de1', cinta: '#f5f5ff' },
      { x: arbol.x + a * 0.28, w: 88 * u, h: 50 * u, color: '#e8b52b', cinta: '#c2263a' }
    ].map(function (r) { r.y = b + 6 * u; r.dy = 0; r.vy = 0; r.tapa = 0; return r; });

    // Estrellas que titilan (el resto son fijas y van en el fondo)
    titilantes = [];
    var rnd = F.semilla(99);
    for (var j = 0; j < 70; j++) {
      titilantes.push({ x: rnd() * W, y: rnd() * H * 0.55, r: (0.8 + rnd() * 1.4) * u, fase: rnd() * TAU, vel: 0.5 + rnd() * 2 });
    }

    ajustarNieve(true);
  }

  function nuevoCopo(W, H, u, arriba) {
    var z = Math.random();
    z = 0.35 + z * z * 0.65; // más copos pequeños (lejanos) que grandes
    return {
      x: Math.random() * W,
      y: arriba ? -10 * u - Math.random() * H * 0.2 : Math.random() * H,
      z: z, capa: z < 0.55 ? 0 : z < 0.8 ? 1 : 2,
      r: (0.9 + z * 2.6) * u,
      caida: (22 + z * 58) * u,
      fase: Math.random() * TAU,
      px: 0, py: 0
    };
  }

  function ajustarNieve(reiniciar) {
    var W = e.ancho, H = e.alto, u = e.u;
    var objetivo = Math.round(420 * (F.limitar(Number(e.ajustes.nieve), 0, 100) / 60) * (e.reducido ? 0.35 : 1));
    if (reiniciar) nieve = [];
    while (nieve.length < objetivo) nieve.push(nuevoCopo(W, H, u, false));
    if (nieve.length > objetivo) nieve.length = objetivo;
  }

  // ---------- Paisaje fijo (se dibuja una vez) ----------
  function colina(ctx, W, H, yBase, amp, rnd, relleno) {
    var f1 = 1.5 + rnd() * 1.5, f2 = 3 + rnd() * 3, f3 = 7 + rnd() * 5;
    var p1 = rnd() * TAU, p2 = rnd() * TAU, p3 = rnd() * TAU;
    var puntos = [];
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W + 10; x += 10) {
      var t = x / W;
      var y = yBase - amp * (0.55 * Math.sin(t * f1 * Math.PI + p1) + 0.3 * Math.sin(t * f2 * Math.PI + p2) + 0.15 * Math.sin(t * f3 * Math.PI + p3));
      puntos.push(y);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = relleno;
    ctx.fill();
    return function (x) { return puntos[Math.max(0, Math.min(puntos.length - 1, Math.round(x / 10)))]; };
  }

  function pino(ctx, x, y, h, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      var yy = y - h * (0.28 + i * 0.26), w = h * (0.34 - i * 0.08);
      ctx.moveTo(x, yy - h * 0.34);
      ctx.lineTo(x + w, yy + h * 0.1);
      ctx.lineTo(x - w, yy + h * 0.1);
    }
    ctx.fill();
    ctx.fillRect(x - h * 0.04, y - h * 0.2, h * 0.08, h * 0.2);
  }

  function casa(ctx, x, y, w, h, rnd, u) {
    var techo = h * 0.55;
    ctx.fillStyle = '#262b47';
    ctx.fillRect(x - w / 2, y - h, w, h);
    // chimenea
    ctx.fillRect(x + w * 0.18, y - h - techo * 0.75, w * 0.12, techo * 0.6);
    // tejado nevado
    ctx.fillStyle = '#eef3ff';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.62, y - h + 2 * u);
    ctx.lineTo(x, y - h - techo);
    ctx.lineTo(x + w * 0.62, y - h + 2 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b9c6e8';
    ctx.fillRect(x - w * 0.62, y - h, w * 1.24, 3 * u);
    // ventanas encendidas
    var vw = w * 0.2, vh = h * 0.28;
    [-0.22, 0.22].forEach(function (dx) {
      if (rnd() < 0.15) return;
      var vx = x + dx * w - vw / 2, vy = y - h * 0.62;
      var g = ctx.createRadialGradient(vx + vw / 2, vy + vh / 2, 0, vx + vw / 2, vy + vh / 2, vw * 2.2);
      g.addColorStop(0, 'rgba(255,200,110,0.45)');
      g.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(vx - vw * 2, vy - vw * 2, vw * 5, vh + vw * 4);
      ctx.fillStyle = '#ffcd6b';
      ctx.fillRect(vx, vy, vw, vh);
      ctx.fillStyle = '#262b47';
      ctx.fillRect(vx + vw / 2 - 0.8 * u, vy, 1.6 * u, vh);
    });
  }

  function pintarFondo(ctx, e) {
    var W = e.ancho, H = e.alto, u = e.u;
    var rnd = F.semilla(2026);

    // Cielo
    var cielo = ctx.createLinearGradient(0, 0, 0, H);
    cielo.addColorStop(0, '#070b1f');
    cielo.addColorStop(0.45, '#17234a');
    cielo.addColorStop(0.75, '#34467a');
    cielo.addColorStop(1, '#4d5f93');
    ctx.fillStyle = cielo;
    ctx.fillRect(0, 0, W, H);

    // Estrellas fijas
    for (var i = 0; i < 260; i++) {
      ctx.globalAlpha = 0.25 + rnd() * 0.6;
      ctx.fillStyle = '#fff';
      var r = (0.4 + rnd() * 1.1) * u;
      ctx.beginPath();
      ctx.arc(rnd() * W, rnd() * H * 0.62, r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Luna
    var lx = W * 0.3, ly = H * 0.17, lr = 44 * u;
    var halo = ctx.createRadialGradient(lx, ly, lr * 0.8, lx, ly, lr * 6);
    halo.addColorStop(0, 'rgba(220,230,255,0.28)');
    halo.addColorStop(1, 'rgba(220,230,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(lx - lr * 6, ly - lr * 6, lr * 12, lr * 12);
    ctx.fillStyle = '#f6f2dd';
    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(150,140,110,0.13)';
    [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.38, 0.12], [0.35, -0.35, 0.09]].forEach(function (c) {
      ctx.beginPath(); ctx.arc(lx + c[0] * lr, ly + c[1] * lr, c[2] * lr, 0, TAU); ctx.fill();
    });

    // Montañas lejanas y colinas nevadas
    colina(ctx, W, H, H * 0.6, H * 0.07, rnd, '#2c3c6e');
    var g2 = ctx.createLinearGradient(0, H * 0.6, 0, H * 0.8);
    g2.addColorStop(0, '#9fb2de'); g2.addColorStop(1, '#5d71a6');
    var cresta2 = colina(ctx, W, H, H * 0.7, H * 0.045, rnd, g2);
    for (var p = 0; p < 46; p++) {
      var xp = rnd() * W, hp = (18 + rnd() * 26) * u;
      pino(ctx, xp, cresta2(xp) + 6 * u, hp, '#1d2b52');
    }
    var g3 = ctx.createLinearGradient(0, H * 0.72, 0, H * 0.9);
    g3.addColorStop(0, '#dbe5fa'); g3.addColorStop(1, '#9bafdb');
    var cresta3 = colina(ctx, W, H, H * 0.79, H * 0.03, rnd, g3);

    // Pueblo
    var casas = Math.max(5, Math.round(W / (240 * u)));
    for (var c = 0; c < casas; c++) {
      var xc = W * (0.08 + 0.56 * (c + rnd() * 0.6) / casas);
      var wc = (42 + rnd() * 30) * u, hc = wc * (0.65 + rnd() * 0.2);
      casa(ctx, xc, cresta3(xc) + 10 * u, wc, hc, rnd, u);
    }
    for (var q = 0; q < 14; q++) {
      var xq = rnd() * W * 0.7;
      pino(ctx, xq, cresta3(xq) + 14 * u, (30 + rnd() * 30) * u, '#173a35');
    }

    // Nieve del primer plano
    var g4 = ctx.createLinearGradient(0, H * 0.84, 0, H);
    g4.addColorStop(0, '#f2f6ff'); g4.addColorStop(1, '#c3d1ef');
    colina(ctx, W, H, H * 0.88, H * 0.018, rnd, g4);

    // Árbol de Navidad
    pintarArbol(ctx, u);
  }

  function pintarArbol(ctx, u) {
    var x = arbol.x, cima = arbol.cima, baseCopa = arbol.baseCopa, ancho = arbol.ancho;
    var altoCopa = baseCopa - cima;
    // sombra
    ctx.fillStyle = 'rgba(40,60,110,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, arbol.base + 8 * u, ancho * 0.62, 18 * u, 0, 0, TAU);
    ctx.fill();
    // tronco
    ctx.fillStyle = '#4a2c1c';
    ctx.fillRect(x - ancho * 0.06, baseCopa - 6 * u, ancho * 0.12, arbol.base - baseCopa + 10 * u);
    // pisos de ramas
    var pisos = 4;
    for (var i = 0; i < pisos; i++) {
      var y0 = cima + altoCopa * (i / pisos) * 0.72;
      var y1 = cima + altoCopa * ((i + 1) / pisos) * (i === pisos - 1 ? 1 : 0.98) + altoCopa * 0.06;
      var semi = ancho * 0.5 * (0.3 + 0.72 * (i + 1) / pisos);
      var grad = ctx.createLinearGradient(x - semi, 0, x + semi, 0);
      grad.addColorStop(0, '#1b6a45');
      grad.addColorStop(0.55, '#145538');
      grad.addColorStop(1, '#0c3d29');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, y0 - (i === 0 ? altoCopa * 0.04 : 0));
      var dientes = 5 + i * 2;
      ctx.lineTo(x + semi, y1);
      for (var d = dientes; d >= 0; d--) {
        var xd = x - semi + (2 * semi * d) / dientes;
        ctx.quadraticCurveTo(xd + semi / dientes, y1 + 9 * u, xd, y1);
      }
      ctx.closePath();
      ctx.fill();
      // nieve en las puntas
      ctx.strokeStyle = 'rgba(240,246,255,0.9)';
      ctx.lineWidth = 4 * u;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (var s = 0; s < dientes; s++) {
        var xs = x - semi + (2 * semi * (s + 0.5)) / dientes;
        ctx.moveTo(xs - semi / dientes * 0.5, y1 + 3 * u);
        ctx.quadraticCurveTo(xs, y1 + 7 * u, xs + semi / dientes * 0.5, y1 + 3 * u);
      }
      ctx.stroke();
    }
  }

  // ---------- Luces: patrones ----------
  // 0 clásico (parpadeo suave) · 1 ola · 2 arcoíris · 3 blanco cálido
  function intensidad(luz, t, patron) {
    if (e.reducido) return 0.85;
    switch (patron) {
      case 1: return 0.2 + 0.8 * Math.max(0, Math.sin(t * 3 - luz.i * 0.45));
      case 2: return 0.85;
      case 3: return 0.75 + 0.25 * Math.sin(t * 0.8 + luz.fase);
      default: return 0.6 + 0.4 * Math.sin(t * 1.6 + luz.fase);
    }
  }
  function spriteLuz(luz, t, patron) {
    if (patron === 2) return BRILLOS[Math.floor((luz.i * 0.35 + t * 1.2) % COLORES.length)];
    if (patron === 3) return BRILLO_CALIDO;
    return BRILLOS[luz.color];
  }
  function colorLuz(luz, t, patron) {
    if (patron === 2) return COLORES[Math.floor((luz.i * 0.35 + t * 1.2) % COLORES.length)];
    if (patron === 3) return '#ffe2b0';
    return COLORES[luz.color];
  }

  // ---------- Interacción ----------
  function tocar(x, y, e) {
    var u = e.u;
    // ¿una bombilla de la guirnalda?
    for (var i = 0; i < bombillas.length; i++) {
      var b = bombillas[i];
      var bx = b.ax + Math.sin(b.ang) * b.largo, by = b.ay + Math.cos(b.ang) * b.largo;
      if ((x - bx) * (x - bx) + (y - by) * (y - by) < 26 * u * 26 * u) {
        b.vel += (x < bx ? 1 : -1) * 7;
        b.destello = 1;
        rafaga(bx, by, COLORES[b.color], 14, 'chispa');
        return;
      }
    }
    // ¿un regalo?
    for (var r = 0; r < regalos.length; r++) {
      var g = regalos[r];
      if (x > g.x - g.w / 2 && x < g.x + g.w / 2 && y > g.y - g.h + g.dy - 20 * u && y < g.y + g.dy) {
        if (g.dy === 0) g.vy = -520 * u;
        g.tapa = 1;
        rafaga(g.x, g.y - g.h, null, 40, 'confeti');
        rafaga(g.x, g.y - g.h, '#fff2b0', 18, 'chispa');
        return;
      }
    }
    // ¿el árbol?
    var altoCopa = arbol.baseCopa - arbol.cima;
    if (y > arbol.cima - 30 * u && y < arbol.baseCopa + 10 * u) {
      var semi = Math.max(20 * u, ((y - arbol.cima) / altoCopa) * arbol.ancho * 0.5);
      if (Math.abs(x - arbol.x) < semi) {
        e.ajustes.patronLuces = (Number(e.ajustes.patronLuces) + 1) % 4;
        arbol.destello = 1;
        rafaga(arbol.x, arbol.cima, '#fff2b0', 30, 'chispa');
        return;
      }
    }
    // En cualquier otro sitio: ráfaga de nieve
    ondas.push({ x: x, y: y, r: 0, vida: 1 });
    rafaga(x, y, '#ffffff', 24, 'copo');
  }

  function rafaga(x, y, color, n, tipo) {
    if (e.reducido) n = Math.ceil(n / 3);
    var u = e.u;
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * TAU, vel = (tipo === 'confeti' ? F.azar(150, 420) : F.azar(60, 300)) * u;
      chispas.push({
        x: x, y: y,
        vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - (tipo === 'confeti' ? 260 * u : 0),
        vida: 0, max: F.azar(0.7, 1.4), tipo: tipo,
        color: color || COLORES[i % COLORES.length],
        tam: (tipo === 'confeti' ? F.azar(4, 8) : F.azar(1.5, 3.5)) * u,
        rot: Math.random() * TAU, vrot: F.azar(-8, 8)
      });
    }
    if (chispas.length > 600) chispas.splice(0, chispas.length - 600);
  }

  // ---------- Animación ----------
  function dibujar(e, dt) {
    var ctx = e.capas.fx.ctx, W = e.ancho, H = e.alto, u = e.u, t = e.t;
    var p = e.puntero;
    var patron = Number(e.ajustes.patronLuces) | 0;
    var lento = e.reducido ? 0.3 : 1;
    ctx.clearRect(0, 0, W, H);

    // Estrellas que titilan
    ctx.fillStyle = '#ffffff';
    for (var s = 0; s < titilantes.length; s++) {
      var st = titilantes[s];
      ctx.globalAlpha = e.reducido ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(t * st.vel + st.fase));
      ctx.fillRect(st.x - st.r / 2, st.y - st.r / 2, st.r, st.r);
    }
    ctx.globalAlpha = 1;

    // Luces del árbol
    ctx.globalCompositeOperation = 'lighter';
    for (var l = 0; l < lucesArbol.length; l++) {
      var luz = lucesArbol[l];
      var k = intensidad(luz, t, patron) * (1 + arbol.destello * 0.6);
      var tam = 26 * u * (0.6 + k * 0.6);
      ctx.globalAlpha = Math.min(1, k);
      ctx.drawImage(spriteLuz(luz, t, patron), luz.x - tam / 2, luz.y - tam / 2, tam, tam);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (var l2 = 0; l2 < lucesArbol.length; l2++) {
      var lz = lucesArbol[l2];
      ctx.fillStyle = colorLuz(lz, t, patron);
      ctx.beginPath(); ctx.arc(lz.x, lz.y, 3.2 * u, 0, TAU); ctx.fill();
    }

    // Estrella del árbol
    arbol.destello = Math.max(0, arbol.destello - dt * 1.2);
    var pulso = 0.8 + 0.2 * Math.sin(t * 2) + arbol.destello;
    var te = 150 * u * pulso;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.9;
    ctx.drawImage(BRILLO_ESTRELLA, arbol.x - te / 2, arbol.cima - te / 2, te, te);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    estrella(ctx, arbol.x, arbol.cima, 22 * u * (1 + arbol.destello * 0.3), t * 0.3 * lento);

    // Regalos
    for (var r = 0; r < regalos.length; r++) {
      var g = regalos[r];
      if (g.vy !== 0 || g.dy !== 0) {
        g.vy += 2200 * u * dt;
        g.dy += g.vy * dt;
        if (g.dy >= 0) { g.dy = 0; g.vy = Math.abs(g.vy) > 200 * u ? -g.vy * 0.35 : 0; }
      }
      g.tapa = Math.max(0, g.tapa - dt * 0.8);
      regalo(ctx, g, u);
    }

    // Guirnalda: cable
    ctx.strokeStyle = '#1b2236';
    ctx.lineWidth = 2.2 * u;
    ctx.beginPath();
    for (var gi = 0; gi < guirnaldas.length; gi++) {
      var tr = guirnaldas[gi];
      ctx.moveTo(tr.x0, tr.y);
      ctx.quadraticCurveTo((tr.x0 + tr.x1) / 2, tr.y + tr.caida * 2, tr.x1, tr.y);
    }
    ctx.stroke();

    // Guirnalda: bombillas con física de péndulo
    var radioEmpuje = 70 * u;
    for (var i = 0; i < bombillas.length; i++) {
      var b = bombillas[i];
      var bx = b.ax + Math.sin(b.ang) * b.largo, by = b.ay + Math.cos(b.ang) * b.largo;
      if (p.activo) {
        var dx = bx - p.x, dy = by - p.y, d2 = dx * dx + dy * dy;
        if (d2 < radioEmpuje * radioEmpuje) {
          var kk = 1 - Math.sqrt(d2) / radioEmpuje;
          b.vel += F.limitar(p.vx / (90 * u), -30, 30) * kk * dt * 2.2;
        }
      }
      b.vel += (-26 * Math.sin(b.ang) - 1.6 * b.vel) * dt;
      b.ang = F.limitar(b.ang + b.vel * dt, -1.3, 1.3);
      b.destello = Math.max(0, b.destello - dt * 1.4);
      bx = b.ax + Math.sin(b.ang) * b.largo; by = b.ay + Math.cos(b.ang) * b.largo;

      var ki = Math.min(1.4, intensidad(b, t, patron) + b.destello);
      var tb = 70 * u * (0.5 + ki * 0.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, ki * 0.85);
      ctx.drawImage(spriteLuz(b, t, patron), bx - tb / 2, by - tb / 2, tb, tb);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      ctx.save();
      ctx.translate(b.ax, b.ay);
      ctx.rotate(-b.ang);
      ctx.strokeStyle = '#1b2236'; ctx.lineWidth = 1.6 * u;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, b.largo - 6 * u); ctx.stroke();
      ctx.fillStyle = '#3b4258';
      ctx.fillRect(-3.5 * u, b.largo - 8 * u, 7 * u, 7 * u);
      ctx.fillStyle = colorLuz(b, t, patron);
      ctx.beginPath(); ctx.ellipse(0, b.largo + 6 * u, 6 * u, 9 * u, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(-2 * u, b.largo + 3 * u, 1.6 * u, 3.5 * u, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // Ondas de los clics
    for (var o = ondas.length - 1; o >= 0; o--) {
      var on = ondas[o];
      on.r += 520 * u * dt;
      on.vida -= dt * 1.6;
      if (on.vida <= 0) { ondas.splice(o, 1); continue; }
      ctx.strokeStyle = 'rgba(255,255,255,' + (on.vida * 0.35).toFixed(3) + ')';
      ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.arc(on.x, on.y, on.r, 0, TAU); ctx.stroke();
    }

    // Nieve
    moverNieve(dt, W, H, u, t, p, lento);
    var alfas = [0.45, 0.7, 0.95];
    ctx.fillStyle = '#ffffff';
    for (var cap = 0; cap < 3; cap++) {
      ctx.globalAlpha = alfas[cap];
      ctx.beginPath();
      for (var n = 0; n < nieve.length; n++) {
        var c = nieve[n];
        if (c.capa !== cap) continue;
        ctx.moveTo(c.x + c.r, c.y);
        ctx.arc(c.x, c.y, c.r, 0, TAU);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Chispas y confeti
    for (var h = chispas.length - 1; h >= 0; h--) {
      var ch = chispas[h];
      ch.vida += dt;
      if (ch.vida > ch.max) { chispas.splice(h, 1); continue; }
      var arrastre = Math.pow(ch.tipo === 'confeti' ? 0.35 : 0.08, dt);
      ch.vx *= arrastre; ch.vy *= arrastre;
      ch.vy += (ch.tipo === 'confeti' ? 520 : ch.tipo === 'copo' ? 60 : 140) * u * dt;
      ch.x += ch.vx * dt; ch.y += ch.vy * dt;
      ch.rot += ch.vrot * dt;
      var vida = 1 - ch.vida / ch.max;
      if (ch.tipo === 'confeti') {
        ctx.save();
        ctx.translate(ch.x, ch.y); ctx.rotate(ch.rot);
        ctx.globalAlpha = Math.min(1, vida * 2);
        ctx.fillStyle = ch.color;
        ctx.fillRect(-ch.tam / 2, -ch.tam / 4 * Math.abs(Math.cos(ch.rot * 2)) - 1, ch.tam, ch.tam / 2 * Math.abs(Math.cos(ch.rot * 2)) + 2);
        ctx.restore();
      } else {
        ctx.globalCompositeOperation = ch.tipo === 'chispa' ? 'lighter' : 'source-over';
        ctx.globalAlpha = vida;
        ctx.fillStyle = ch.color;
        ctx.beginPath(); ctx.arc(ch.x, ch.y, ch.tam * (ch.tipo === 'chispa' ? vida : 1), 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;
  }

  function moverNieve(dt, W, H, u, t, p, lento) {
    var fuerza = F.limitar(Number(e.ajustes.fuerzaCursor), 0, 100) / 60;
    var R = 150 * u * Math.sqrt(Math.max(fuerza, 0.05));
    var R2 = R * R;
    var viento = Math.sin(t * 0.13) * 14 * u + Math.sin(t * 0.41) * 6 * u;
    var amort = Math.pow(0.12, dt);
    var activo = p.activo && fuerza > 0;
    for (var i = 0; i < nieve.length; i++) {
      var c = nieve[i];
      c.fase += dt * (0.5 + c.z);
      if (activo) {
        var dx = c.x - p.x, dy = c.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          var d = Math.sqrt(d2) || 1, k = 1 - d / R;
          var empuje = k * k * 2600 * u * fuerza * (0.4 + c.z * 0.6) * dt;
          c.px += (dx / d) * empuje + p.vx * k * 2.2 * dt;
          c.py += (dy / d) * empuje + p.vy * k * 2.2 * dt;
        }
      }
      for (var o = 0; o < ondas.length; o++) {
        var on = ondas[o];
        var ox = c.x - on.x, oy = c.y - on.y, od = Math.sqrt(ox * ox + oy * oy) || 1;
        var banda = Math.abs(od - on.r);
        if (banda < 40 * u) {
          var ko = (1 - banda / (40 * u)) * on.vida * 900 * u * dt;
          c.px += (ox / od) * ko; c.py += (oy / od) * ko;
        }
      }
      c.px *= amort; c.py *= amort;
      c.x += (Math.sin(c.fase) * 12 * u * c.z + viento * c.z) * dt * lento + c.px * dt;
      c.y += c.caida * dt * lento + c.py * dt;
      if (c.y > H + 8 * u) { c.y = -8 * u; c.x = Math.random() * W; c.px = c.py = 0; }
      else if (c.y < -60 * u) c.y = H + 6 * u;
      if (c.x < -10 * u) c.x += W + 20 * u;
      else if (c.x > W + 10 * u) c.x -= W + 20 * u;
    }
  }

  function estrella(ctx, x, y, r, giro) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(giro) * 0.15);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#ffc93c');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function regalo(ctx, g, u) {
    var x = g.x - g.w / 2, y = g.y - g.h + g.dy;
    ctx.fillStyle = 'rgba(40,60,110,0.22)';
    ctx.beginPath(); ctx.ellipse(g.x, g.y + 2 * u, g.w * 0.55, 6 * u, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = g.color;
    ctx.fillRect(x, y, g.w, g.h);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + g.w * 0.6, y, g.w * 0.4, g.h);
    ctx.fillStyle = g.cinta;
    ctx.fillRect(g.x - 5 * u, y, 10 * u, g.h);
    // tapa (se levanta al tocar)
    var lev = g.tapa * 22 * u;
    ctx.save();
    ctx.translate(g.x, y - lev);
    ctx.rotate(-g.tapa * 0.35);
    ctx.fillStyle = g.color;
    ctx.fillRect(-g.w / 2 - 4 * u, -12 * u, g.w + 8 * u, 12 * u);
    ctx.fillStyle = g.cinta;
    ctx.fillRect(-5 * u, -12 * u, 10 * u, 12 * u);
    ctx.beginPath();
    ctx.ellipse(-10 * u, -16 * u, 10 * u, 6 * u, -0.5, 0, TAU);
    ctx.ellipse(10 * u, -16 * u, 10 * u, 6 * u, 0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
})();
