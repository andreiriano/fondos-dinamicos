/*
 * Navidad · Fondos Dinámicos (MIT)
 *
 * Un fondo que es también un pequeño juego:
 *  - Enciende el árbol: cada bombilla se enciende con un clic (o dejando el ratón quieto encima un momento).
 *    Con todas encendidas se ilumina la estrella, hay fuegos artificiales y aparece una aurora.
 *    Cada día el árbol empieza apagado; encenderlo varios días seguidos da logros.
 *  - Calendario de adviento: del 1 al 24 de diciembre, un regalo por día bajo el árbol.
 *  - Copos dorados: aparecen de vez en cuando; al recogerlos se desbloquean extras.
 *  - Parallax con el ratón, nieve con profundidad, viento que cambia y estrellas fugaces.
 *
 * Arte: arte/ (lo prepara herramientas/preparar_arte.py). Posiciones: escena.js.
 * Modo editor para colocar luces sobre un árbol nuevo: index.html?editar=1
 */
(function () {
  'use strict';
  var F = window.FondosDinamicos, J = window.Juego, A = window.ARTE || {}, S = window.ESCENA;
  var TAU = Math.PI * 2;
  var EDITAR = /[?&]editar=1/.test(location.search);

  var COLORES = ['#ff5a4f', '#ffd34d', '#5be584', '#59b9ff', '#ff7be5', '#ffad55'];
  var BRILLOS = COLORES.map(function (c) { return F.brillo(c, 128); });
  var BRILLO_CALIDO = F.brillo('#ffcf8a', 256);
  var BRILLO_BLANCO = F.brillo('#ffffff', 64);
  var BRILLO_DORADO = F.brillo('#ffcf4a', 128);
  var COPO_SUAVE = F.sprite(64, function (ctx, t) {
    var g = ctx.createRadialGradient(t / 2, t / 2, 0, t / 2, t / 2, t / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.45, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, t, t);
  });

  // ---------- Carga de imágenes ----------
  var img = {};
  function cargar(nombre, ruta, alListo) {
    var im = new Image();
    im.decoding = 'async';
    im.onload = function () { img[nombre] = im; if (alListo) alListo(); };
    im.src = ruta;
  }
  var nombresSprites = Object.keys(A.sprites || {});
  var SPR_REGALOS = nombresSprites.filter(function (n) { return n.indexOf('regalo') === 0; });
  var SPR_ADORNOS = nombresSprites.filter(function (n) { return n.indexOf('adorno') === 0; });

  // ---------- Estado de la escena ----------
  var e = null;
  var caja = { x0: 0, y0: 0, w: 1, h: 1 };
  var luces = [], adornos = [], regalos = [];
  var nieveLejos = [], nieveMedio = [], nieveCerca = [];
  var copos = [], partCielo = [], partLuces = [], partFrente = [], cohetes = [], fugaces = [], ondas = [];
  var guirnaldas = [], bombillasG = [];
  var off = { x: 0, y: 0 }, ultimoTransform = '';
  var viento = 0, rafaga = null, proximaRafaga = 15;
  var completo = false, celebracion = 0, fuegosHasta = 0, proximoCohete = 0;
  var aurora = { alfa: 0, objetivo: 0, hasta: 0 };
  var tira = null;
  var estrella = { x: 0, y: 0, h: 0, destello: 0 };
  var trineo = { activo: false, t: 0, proximo: 40 };
  var proximoCopo = 14, proximaFugaz = 10, lluviaEstrellas = 0, nieveDorada = 0;
  var foco = { clave: null, desde: 0 }, hecho = null;
  var pista = { i: -1, t0: 0, proxima: 5 };
  var brilloArbol = 0, brilloAplicado = -1;
  var patron = 0, proximoPatron = 25;
  var luna = [0, 0], escPlano = 1, humo = [], chimeneas = [], ventanas = [];
  var video = null;
  var avisoInicial = false, ultimoAvisoDecorativo = -99;
  var editor = { modo: 'luces', datos: null };

  var CAPAS = { cielo: { p: 0.3, s: 1.06 }, arbol: { p: 0.6, s: 1 }, luces: { p: 0.6, s: 1 }, frente: { p: 1, s: 1.04 } };

  F.crearFondo({
    capas: ['cielo', 'arbol', 'luces', 'frente'],
    ajustes: { nieve: 60, parallax: 60, video: true, marcador: true, arbolEncendido: false, fps: 60 },
    alRedimensionar: preparar,
    estaticas: { arbol: pintarArbol },
    dibujar: dibujar,
    alTocar: tocar,
    alCambiarAjuste: cambiarAjuste,
    alPausar: function (pausado) {
      if (!video) return;
      if (pausado) video.pause(); else { var pr = video.play(); if (pr && pr.catch) pr.catch(function () {}); }
    },
    capturarDebajo: function (ctx, w, h) {
      var im = img.plano;
      if (!im) return;
      var s = Math.max(w / im.width, h / im.height);
      ctx.drawImage(im, (w - im.width * s) * enfoquePlano(), (h - im.height * s) / 2, im.width * s, im.height * s);
    }
  });

  // ---------- Carga inicial ----------
  (function iniciar() {
    var imagen = document.getElementById('imagen');
    if (A.plano) {
      imagen.src = A.plano.archivo;
      cargar('plano', A.plano.archivo);
    }
    ponerVideo();
    if (A.arbol) cargar('arbol', A.arbol.archivo, function () { e.redibujarFondo(); });
    nombresSprites.forEach(function (n) {
      cargar(n, A.sprites[n].archivo, n === 'muneco' ? function () { e.redibujarFondo(); } : null);
    });
    actualizarHud();
    if (EDITAR) iniciarEditor();
    setInterval(function () { // cambio de día (medianoche)
      var d = J.claveDia(J.hoy());
      if (d !== iniciar.dia) { iniciar.dia = d; recalcularLuces(); actualizarRegalos(); actualizarHud(); }
    }, 60000);
    iniciar.dia = J.claveDia(J.hoy());
  })();

  function ponerVideo() {
    var quiere = e.ajustes.video !== false && A.video && !EDITAR;
    var cont = document.getElementById('plano');
    if (quiere && !video) {
      video = document.createElement('video');
      video.muted = true; video.defaultMuted = true; video.loop = true; video.autoplay = true; video.playsInline = true;
      video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
      video.preload = 'auto';
      if (A.plano) video.poster = A.plano.archivo;
      [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(function (par) {
        if (!A.video[par[0]]) return;
        var src = document.createElement('source');
        src.src = A.video[par[0]]; src.type = par[1];
        video.appendChild(src);
      });
      video.style.objectPosition = (enfoquePlano() * 100).toFixed(1) + '% 50%';
      video.style.opacity = '0';
      video.style.transition = 'opacity .8s';
      video.addEventListener('playing', function () { video.style.opacity = '1'; });
      cont.appendChild(video);
      var pr = video.play(); if (pr && pr.catch) pr.catch(function () {});
    } else if (!quiere && video) {
      video.pause(); video.remove(); video = null;
    }
  }

  // ---------- Geometría ----------
  function aCapa(nombre, x, y) {
    var c = CAPAS[nombre], W = e.ancho, H = e.alto;
    return [(x - off.x * c.p - W / 2) / c.s + W / 2, (y - off.y * c.p - H / 2) / c.s + H / 2];
  }
  function desdeCapa(nombre, x, y) {
    var c = CAPAS[nombre], W = e.ancho, H = e.alto;
    return [(x - W / 2) * c.s + W / 2 + off.x * c.p, (y - H / 2) * c.s + H / 2 + off.y * c.p];
  }
  function datosArbol() {
    var a = A.arbol || { w: 1000, h: 1400, original: [1000, 1400], recorte: [0, 0, 1000, 1400] };
    return { w: a.w, h: a.h, ow: (a.original || [a.w, a.h])[0], oh: (a.original || [a.w, a.h])[1], r: a.recorte || [0, 0, a.w, a.h] };
  }
  function arbolAPantalla(u, v) {
    var a = datosArbol();
    return [caja.x0 + (u * a.ow - a.r[0]) * caja.w / (a.r[2] - a.r[0]), caja.y0 + (v * a.oh - a.r[1]) * caja.h / (a.r[3] - a.r[1])];
  }
  function pantallaAArbol(x, y) {
    var a = datosArbol();
    return [((x - caja.x0) * (a.r[2] - a.r[0]) / caja.w + a.r[0]) / a.ow, ((y - caja.y0) * (a.r[3] - a.r[1]) / caja.h + a.r[1]) / a.oh];
  }
  // Qué parte del plano se ve cuando la pantalla es más estrecha que la imagen (0 = izquierda, 0.5 = centro)
  function enfoquePlano() {
    return e.alto > e.ancho * 1.05 && S.plano.enfoqueVertical !== undefined ? S.plano.enfoqueVertical : 0.5;
  }
  function planoAPantalla(u, v) {
    var pw = A.plano ? A.plano.w : 1920, ph = A.plano ? A.plano.h : 1080;
    var s = Math.max(e.ancho / pw, e.alto / ph);
    return [(e.ancho - pw * s) * enfoquePlano() + u * pw * s, (e.alto - ph * s) / 2 + v * ph * s];
  }

  function preparar(estado) {
    e = estado;
    var W = e.ancho, H = e.alto, u = e.u;
    var conf = H > W * 1.05 && S.arbol.vertical ? S.arbol.vertical : S.arbol;
    var a = datosArbol();
    caja.h = conf.alto * H;
    caja.w = caja.h * a.w / a.h;
    caja.x0 = conf.x * W - caja.w / 2;
    caja.y0 = conf.base * H - caja.h;
    luna = planoAPantalla(S.plano.luna[0], S.plano.luna[1]);
    var posicion = (enfoquePlano() * 100).toFixed(1) + '% 50%';
    document.getElementById('imagen').style.objectPosition = posicion;
    if (video) video.style.objectPosition = posicion;
    escPlano = Math.max(W / (A.plano ? A.plano.w : 1920), H / (A.plano ? A.plano.h : 1080));
    chimeneas = (S.plano.chimeneas || []).map(function (q) { return planoAPantalla(q[0], q[1]); });
    ventanas = (S.plano.ventanas || []).map(function (q, i) { var v = planoAPantalla(q[0], q[1]); return { x: v[0], y: v[1], fase: i * 2.3, vel: 0.7 + (i % 5) * 0.25 }; });
    var pe = arbolAPantalla(S.arbol.estrella[0], S.arbol.estrella[1]);
    estrella.x = pe[0]; estrella.y = pe[1]; estrella.h = S.arbol.estrella[2] * caja.h;
    recalcularLuces();
    adornos = (S.arbol.adornos || []).map(function (p, i) {
      var q = arbolAPantalla(p[0], p[1]);
      return { x: q[0], y: q[1], fase: i * 1.7, ang: 0, vel: 0 };
    });
    actualizarRegalos();
    prepararGuirnalda();
    ajustarNieve(true);
    tira = null;
  }

  function recalcularLuces() {
    var encendidas = J.lucesDeHoy();
    var radio = (S.arbol.tamLuz || 0.011) * caja.h;
    luces = (S.arbol.luces || []).map(function (p, i) {
      var q = arbolAPantalla(p[0], p[1]);
      var anterior = luces[i];
      return {
        x: q[0], y: q[1], r: radio, i: i, color: i % COLORES.length,
        encendida: encendidas.indexOf(i) >= 0, pop: anterior ? anterior.pop : 0, fase: Math.random() * TAU
      };
    });
    completo = luces.length > 0 && luces.every(function (l) { return l.encendida; });
  }

  function arbolEncendidoSolo() { return e.ajustes.arbolEncendido === true || e.ajustes.arbolEncendido === 'true'; }

  // ---------- Regalos (calendario de adviento) ----------
  function actualizarRegalos() {
    var pend = J.regalosPendientes(), disp = J.diasDisponibles();
    var huecos = S.arbol.regalos || [];
    var viejos = regalos;
    regalos = huecos.map(function (h, k) {
      var dia = k < pend.length ? pend[k] : null;
      var nombre = SPR_REGALOS.length ? SPR_REGALOS[((dia || k + 1) - 1 + SPR_REGALOS.length) % SPR_REGALOS.length] : null;
      var meta = nombre ? A.sprites[nombre] : { w: 100, h: 100 };
      var base = arbolAPantalla(h[0], h[1]);
      var alto = h[2] * caja.h;
      var ancho = alto * meta.w / meta.h;
      var antes = viejos[k];
      return {
        dia: dia, hoy: dia !== null && dia === disp, sprite: nombre,
        x: base[0], y: base[1], w: ancho, h: alto, fase: k * 1.3,
        abriendo: antes && antes.dia === dia ? antes.abriendo : 0, salto: 0
      };
    }).sort(function (a, b) { return a.y - b.y; });
  }

  // ---------- Guirnalda superior (desbloqueo) ----------
  function prepararGuirnalda() {
    guirnaldas = []; bombillasG = [];
    if (!J.desbloqueado('guirnalda')) return;
    var W = e.ancho, H = e.alto, u = e.u;
    var tramos = Math.max(2, Math.round(W / (720 * u)));
    var anchoTramo = (W * 1.04) / tramos;
    for (var g = 0; g < tramos; g++) {
      var x0 = -W * 0.02 + g * anchoTramo;
      var tr = { x0: x0, x1: x0 + anchoTramo, y: -6 * u, caida: H * 0.06 + (g % 2) * H * 0.012 };
      guirnaldas.push(tr);
      var n = Math.max(5, Math.round(anchoTramo / (70 * u)));
      for (var i = 0; i < n; i++) {
        var t = (i + 0.5) / n;
        bombillasG.push({
          ax: F.mezclar(tr.x0, tr.x1, t), ay: tr.y + tr.caida * (1 - Math.pow(2 * t - 1, 2)),
          ang: 0, vel: 0, largo: 14 * u, color: bombillasG.length % COLORES.length, fase: Math.random() * TAU
        });
      }
    }
  }

  // ---------- Nieve con profundidad ----------
  function ajustarNieve(reiniciar) {
    var f = F.limitar(Number(e.ajustes.nieve), 0, 100) / 60 * (e.reducido ? 0.35 : 1);
    var W = e.ancho, H = e.alto, u = e.u;
    function rellenar(lista, n, crear) {
      if (reiniciar) lista.length = 0;
      while (lista.length < n) lista.push(crear(true));
      if (lista.length > n) lista.length = n;
    }
    rellenar(nieveLejos, Math.round(170 * f), function () {
      return { x: Math.random() * W, y: Math.random() * H, r: (0.5 + Math.random() * 0.8) * u, v: (12 + Math.random() * 16) * u, fase: Math.random() * TAU };
    });
    rellenar(nieveMedio, Math.round(230 * f), function () {
      return { x: Math.random() * W, y: Math.random() * H, r: (1.1 + Math.random() * 1.6) * u, v: (30 + Math.random() * 35) * u, fase: Math.random() * TAU, px: 0, py: 0 };
    });
    rellenar(nieveCerca, Math.round(22 * f), function () {
      return { x: Math.random() * W, y: Math.random() * H, r: (7 + Math.random() * 9) * u, v: (85 + Math.random() * 60) * u, fase: Math.random() * TAU, px: 0, py: 0 };
    });
  }

  function moverNieve(lista, dt, prof, p, capa, conEmpuje) {
    var W = e.ancho, H = e.alto, u = e.u, lento = e.reducido ? 0.35 : 1;
    var pc = conEmpuje && p.activo ? aCapa(capa, p.x, p.y) : null;
    var R = 140 * u, R2 = R * R, amort = Math.pow(0.12, dt);
    for (var i = 0; i < lista.length; i++) {
      var c = lista[i];
      c.fase += dt * 0.8;
      if (pc) {
        var dx = c.x - pc[0], dy = c.y - pc[1], d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          var d = Math.sqrt(d2) || 1, k = 1 - d / R;
          var emp = k * k * 2400 * u * dt;
          c.px += (dx / d) * emp + p.vx * k * 2 * dt;
          c.py += (dy / d) * emp + p.vy * k * 2 * dt;
        }
      }
      for (var o = 0; o < ondas.length; o++) {
        if (!conEmpuje) break;
        var on = ondas[o], ox = c.x - on.x, oy = c.y - on.y, od = Math.sqrt(ox * ox + oy * oy) || 1;
        var banda = Math.abs(od - on.r);
        if (banda < 40 * u) { var ko = (1 - banda / (40 * u)) * on.vida * 900 * u * dt; c.px += ox / od * ko; c.py += oy / od * ko; }
      }
      if (c.px !== undefined) { c.px *= amort; c.py *= amort; }
      c.x += (Math.sin(c.fase) * 10 * u + viento * prof) * dt * lento + (c.px || 0) * dt;
      c.y += c.v * dt * lento + (c.py || 0) * dt;
      if (c.y > H + c.r * 2) { c.y = -c.r * 2; c.x = Math.random() * W; }
      else if (c.y < -60 * u) c.y = H;
      if (c.x < -20 * u) c.x += W + 40 * u; else if (c.x > W + 20 * u) c.x -= W + 40 * u;
    }
  }

  // ---------- Árbol (capa fija) ----------
  function pintarArbol(ctx, e) {
    // sombra suave sobre la nieve, bajo la base del árbol (la luna está a la izquierda: se alarga a la derecha)
    var sb = S.arbol.sombra || [0.5, 0.975, 0.62];
    var ps = arbolAPantalla(sb[0], sb[1]);
    var rx = caja.w * sb[2], ry = caja.h * 0.045;
    ctx.save();
    ctx.translate(ps[0] + rx * 0.12, ps[1]);
    ctx.scale(1, ry / rx);
    var gs = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    gs.addColorStop(0, 'rgba(18,26,64,0.55)'); gs.addColorStop(0.55, 'rgba(18,26,64,0.28)'); gs.addColorStop(1, 'rgba(18,26,64,0)');
    ctx.fillStyle = gs;
    ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
    ctx.restore();
    if (img.arbol) ctx.drawImage(img.arbol, caja.x0, caja.y0, caja.w, caja.h);
    if (J.desbloqueado('muneco')) pintarMuneco(ctx);
  }
  function pintarMuneco(ctx) {
    var m = S.muneco, W = e.ancho, H = e.alto;
    var alto = m.alto * H, base = m.base * H, x = m.x * W;
    if (img.muneco) {
      var ancho = alto * img.muneco.width / img.muneco.height;
      ctx.fillStyle = 'rgba(30,40,80,0.25)';
      ctx.beginPath(); ctx.ellipse(x, base, ancho * 0.45, alto * 0.04, 0, 0, TAU); ctx.fill();
      ctx.drawImage(img.muneco, x - ancho / 2, base - alto, ancho, alto);
      return;
    }
    var r = alto / 5.6;
    ctx.fillStyle = '#f2f6ff';
    [[0, -r * 1.2, r * 1.25], [0, -r * 3.1, r * 0.95], [0, -r * 4.6, r * 0.7]].forEach(function (b) {
      ctx.beginPath(); ctx.arc(x + b[0], base + b[1], b[2], 0, TAU); ctx.fill();
    });
    ctx.fillStyle = '#e8792a';
    ctx.beginPath(); ctx.moveTo(x, base - r * 4.6); ctx.lineTo(x + r * 0.9, base - r * 4.5); ctx.lineTo(x, base - r * 4.4); ctx.fill();
  }

  // ---------- Ajustes ----------
  function cambiarAjuste(nombre, valor) {
    if (nombre === 'nieve' || nombre === 'reducido') ajustarNieve(false);
    else if (nombre === 'video') ponerVideo();
    else if (nombre === 'marcador') actualizarHud();
    else if (nombre === 'arbolEncendido') recalcularLuces();
    else if (nombre === 'reiniciar') {
      J.reiniciar(); recalcularLuces(); actualizarRegalos(); prepararGuirnalda(); actualizarHud(); e.redibujarFondo();
      aviso(J.EN ? 'Progress reset.' : 'Progreso reiniciado.');
    }
  }

  // ---------- Marcador y avisos ----------
  function actualizarHud() {
    var hud = document.getElementById('hud');
    hud.hidden = EDITAR || e.ajustes.marcador === false || e.ajustes.marcador === 'false';
    document.querySelector('#hud-copos b').textContent = J.copos;
    var racha = J.rachaActual();
    document.querySelector('#hud-racha b').textContent = racha === 1 ? J.texto('unDia') : J.texto('racha', racha);
    var sig = J.siguienteDesbloqueo();
    document.getElementById('hud-copos').title = sig ? J.texto('faltan', sig.copos) : '';
  }
  function saltoHud(id) {
    var el = document.getElementById(id);
    el.classList.add('salto');
    setTimeout(function () { el.classList.remove('salto'); }, 320);
  }
  function aviso(html, segundos) {
    var cont = document.getElementById('avisos');
    var el = document.createElement('div');
    el.className = 'aviso';
    el.innerHTML = html;
    cont.appendChild(el);
    while (cont.children.length > 3) cont.removeChild(cont.firstChild);
    requestAnimationFrame(function () { el.classList.add('visible'); });
    setTimeout(function () { el.classList.remove('visible'); setTimeout(function () { el.remove(); }, 500); }, (segundos || 5) * 1000);
  }
  function avisarLogros(lista) {
    (lista || []).forEach(function (id, i) {
      setTimeout(function () { aviso('★ <b>' + J.texto('logro') + ':</b> ' + J.nombreLogro(id), 6); }, 600 + i * 900);
    });
  }
  function escapar(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var temporizadorTarjeta = 0;
  function tarjeta(titulo, textoHtml, x, y) {
    var el = document.getElementById('tarjeta');
    el.innerHTML = '<div class="dia">' + escapar(titulo) + '</div>' + textoHtml;
    var W = e.ancho;
    el.style.left = Math.max(12, Math.min(W - 272, x - 130)) + 'px';
    el.style.top = Math.max(12, y - 150) + 'px';
    el.classList.add('visible');
    clearTimeout(temporizadorTarjeta);
    temporizadorTarjeta = setTimeout(function () { el.classList.remove('visible'); }, 7500);
  }

  // ---------- Acciones del juego ----------
  function encenderLuz(l) {
    if (l.encendida) return;
    if (!J.encender(l.i)) { l.encendida = true; return; }
    l.encendida = true; l.pop = 1;
    chispas(partLuces, l.x, l.y, COLORES[l.color], 12, 160);
    var faltan = luces.filter(function (x) { return !x.encendida; }).length;
    if (faltan === 0) celebrar(true);
  }

  function celebrar(conLogros) {
    completo = true;
    celebracion = 1;
    estrella.destello = 1.5;
    lanzarFuegos(e.reducido ? 0 : 12);
    aurora.objetivo = 0.55;
    chispas(partLuces, estrella.x, estrella.y, '#fff2b0', 40, 300);
    aviso('✨ <b>' + J.texto('arbolEncendido') + '</b>', 5);
    if (conLogros) { avisarLogros(J.arbolCompleto()); actualizarHud(); saltoHud('hud-racha'); }
  }

  function abrirRegalo(g) {
    if (g.dia === null || g.abriendo) return;
    var res = J.abrirRegalo(g.dia);
    if (!res) return;
    g.abriendo = 0.001;
    chispas(partLuces, g.x, g.y - g.h * 0.6, null, 40, 340, 'confeti');
    chispas(partLuces, g.x, g.y - g.h * 0.6, '#fff2b0', 20, 220);
    var s = res.sorpresa;
    var pos = desdeCapa('luces', g.x, g.y - g.h);
    var texto = escapar(J.t(s.texto));
    if (s.tipo === 'prompt') texto = texto.replace('xuiatek.com/fondos', '<b>xuiatek.com/fondos</b>');
    tarjeta(J.texto('regaloDia', g.dia), texto, pos[0], pos[1]);
    if (s.tipo === 'anim') animacion(s.anim);
    avisarLogros(res.logros);
    setTimeout(function () { actualizarRegalos(); }, 700);
  }

  function animacion(nombre) {
    if (nombre === 'estrellas') lluviaEstrellas = 6;
    else if (nombre === 'aurora') { aurora.objetivo = 1; aurora.hasta = e.t + 25; }
    else if (nombre === 'trineo') { trineo.activo = true; trineo.t = 0; }
    else if (nombre === 'fuegos') lanzarFuegos(12);
    else if (nombre === 'nieveDorada') nieveDorada = 5;
    else if (nombre === 'arcoiris') patron = 2;
    else if (nombre === 'nochebuena') { lanzarFuegos(20); aurora.objetivo = 1; aurora.hasta = e.t + 30; lluviaEstrellas = 5; }
  }

  function recogerPorObjeto(c) {
    var idx = copos.indexOf(c);
    if (idx >= 0) recogerCopo(c, idx);
  }

  function recogerCopo(c, idx) {
    copos.splice(idx, 1);
    chispas(partFrente, c.x, c.y, '#ffd24a', 26, 260);
    var destino = aCapa('frente', e.ancho - 120, 30);
    partFrente.push({ x: c.x, y: c.y, vx: 0, vy: 0, vida: 0, max: 0.9, tipo: 'vuela', ox: c.x, oy: c.y, dx: destino[0], dy: destino[1], tam: c.tam * 0.6, color: '#ffd24a' });
    var res = J.sumarCopo();
    setTimeout(function () { actualizarHud(); saltoHud('hud-copos'); }, 850);
    var msg = '❄ <b>' + J.texto('copoDorado') + '</b> ' + res.total;
    if (res.desbloqueo) {
      msg += '<br>' + J.texto('desbloqueado') + J.t(res.desbloqueo.texto);
      if (res.desbloqueo.id === 'trineo') { trineo.activo = true; trineo.t = 0; }
      if (res.desbloqueo.id === 'muneco') e.redibujarFondo();
      if (res.desbloqueo.id === 'guirnalda') prepararGuirnalda();
    } else {
      var sig = J.siguienteDesbloqueo();
      if (sig) msg += '<br>' + J.texto('faltan', sig.copos);
    }
    aviso(msg, 5);
    avisarLogros(res.logros);
  }

  // ---------- Objetivos (clic o ratón quieto encima) ----------
  function buscarObjetivo(px, py) {
    var u = e.u;
    var f = aCapa('frente', px, py);
    for (var i = copos.length - 1; i >= 0; i--) {
      var c = copos[i];
      if (Math.hypot(f[0] - c.x, f[1] - c.y) < Math.max(c.tam * 0.9, 26 * u)) {
        return { clave: c, capa: 'frente', x: c.x, y: c.y, r: c.tam * 0.8, dur: 0.25, accion: recogerPorObjeto.bind(null, c) };
      }
    }
    var l = aCapa('luces', px, py);
    for (var r = regalos.length - 1; r >= 0; r--) {
      var g = regalos[r];
      if (l[0] > g.x - g.w / 2 && l[0] < g.x + g.w / 2 && l[1] > g.y - g.h && l[1] < g.y) {
        if (g.dia !== null && !g.abriendo) return { clave: 'regalo' + g.dia, capa: 'luces', x: g.x, y: g.y - g.h / 2, r: Math.max(g.w, g.h) * 0.55, dur: 0.9, accion: abrirRegalo.bind(null, g) };
        return { clave: 'decorativo' + r, capa: 'luces', x: g.x, y: g.y - g.h / 2, r: 0, dur: 0.6, accion: avisoDecorativo, sinAnillo: true };
      }
    }
    if (!arbolEncendidoSolo()) {
      var mejor = null, dmin = 1e9;
      for (var k = 0; k < luces.length; k++) {
        var lz = luces[k];
        if (lz.encendida) continue;
        var d = Math.hypot(l[0] - lz.x, l[1] - lz.y);
        if (d < Math.max(lz.r * 2.6, 16 * u) && d < dmin) { dmin = d; mejor = lz; }
      }
      if (mejor) return { clave: 'luz' + mejor.i, capa: 'luces', x: mejor.x, y: mejor.y, r: mejor.r * 2.4, dur: 0.35, accion: encenderLuz.bind(null, mejor) };
    }
    if ((completo || arbolEncendidoSolo()) && Math.hypot(l[0] - estrella.x, l[1] - estrella.y) < estrella.h * 0.6) {
      return { clave: 'estrella', capa: 'luces', x: estrella.x, y: estrella.y, r: estrella.h * 0.6, dur: 1.2, accion: function () {
        patron = (patron + 1) % (J.arcoirisDesbloqueado() ? 3 : 2); estrella.destello = 1.2; lanzarFuegos(e.reducido ? 0 : 6);
      } };
    }
    return null;
  }
  function avisoDecorativo() {
    if (e.t - ultimoAvisoDecorativo < 20) return;
    ultimoAvisoDecorativo = e.t;
    aviso(J.antesDeAdviento() ? J.texto('empiezaAdviento') : J.texto('vuelveManana'), 4);
  }

  function tocar(x, y) {
    if (EDITAR) { tocarEditor(x, y); return; }
    var obj = buscarObjetivo(x, y);
    if (obj) { obj.accion(); hecho = obj.clave; return; }
    var f = aCapa('frente', x, y);
    ondas.push({ x: f[0], y: f[1], r: 0, vida: 1 });
    chispas(partFrente, f[0], f[1], '#ffffff', 16, 200, 'copo');
  }

  function actualizarFoco() {
    var p = e.puntero;
    if (EDITAR || !p.activo) { foco.clave = null; return; }
    var reciente = performance.now() - p.ultimo < 1600; // si el ratón se fue a otra ventana, no cuenta
    var obj = buscarObjetivo(p.x, p.y);
    if (!obj) { foco.clave = null; hecho = null; return; }
    if (obj.clave === hecho) { foco.clave = null; return; }
    if (obj.clave !== foco.clave) { foco = obj; foco.desde = e.t; return; }
    foco.x = obj.x; foco.y = obj.y; foco.accion = obj.accion;
    if (!reciente) { foco.desde = e.t; return; }
    if (e.t - foco.desde >= foco.dur) { foco.accion(); hecho = foco.clave; foco.clave = null; }
  }
  function dibujarAnillo(ctx, capa) {
    if (!foco.clave || foco.capa !== capa || foco.sinAnillo || foco.dur < 0.3) return;
    var prog = F.limitar((e.t - foco.desde) / foco.dur, 0, 1);
    if (prog < 0.08) return;
    ctx.strokeStyle = 'rgba(255,240,190,0.9)';
    ctx.lineWidth = 2.5 * e.u;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(foco.x, foco.y, Math.max(foco.r, 14 * e.u), -Math.PI / 2, -Math.PI / 2 + prog * TAU);
    ctx.stroke();
  }

  // ---------- Partículas ----------
  function chispas(lista, x, y, color, n, vel, tipo) {
    if (e.reducido) n = Math.ceil(n / 3);
    var u = e.u;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, v = (0.3 + Math.random() * 0.7) * vel * u;
      lista.push({
        x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (tipo === 'confeti' ? 200 * u : 0),
        vida: 0, max: 0.7 + Math.random() * 0.8, tipo: tipo || 'chispa',
        color: color || COLORES[i % COLORES.length], tam: (tipo === 'confeti' ? 5 + Math.random() * 4 : 1.4 + Math.random() * 2.4) * u,
        rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 12
      });
    }
    if (lista.length > 700) lista.splice(0, lista.length - 700);
  }
  function dibujarParticulas(ctx, lista, dt) {
    var u = e.u;
    for (var i = lista.length - 1; i >= 0; i--) {
      var c = lista[i];
      c.vida += dt;
      if (c.vida > c.max) { lista.splice(i, 1); continue; }
      var t = c.vida / c.max, vida = 1 - t;
      if (c.tipo === 'vuela') {
        var k = t * t * (3 - 2 * t);
        c.x = F.mezclar(c.ox, c.dx, k); c.y = F.mezclar(c.oy, c.dy, k) - Math.sin(t * Math.PI) * 80 * u;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.9;
        var tb = c.tam * 3;
        ctx.drawImage(BRILLO_DORADO, c.x - tb / 2, c.y - tb / 2, tb, tb);
        ctx.globalCompositeOperation = 'source-over';
        continue;
      }
      var arr = Math.pow(c.tipo === 'confeti' ? 0.35 : c.tipo === 'brasa' ? 0.4 : 0.1, dt);
      c.vx *= arr; c.vy *= arr;
      c.vy += (c.tipo === 'confeti' ? 520 : c.tipo === 'brasa' ? 90 : c.tipo === 'copo' ? 50 : 120) * u * dt;
      c.px = c.x; c.py = c.y;
      c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vrot * dt;
      if (c.tipo === 'confeti') {
        ctx.save();
        ctx.translate(c.x, c.y); ctx.rotate(c.rot);
        ctx.globalAlpha = Math.min(1, vida * 2);
        ctx.fillStyle = c.color;
        var fl = Math.abs(Math.cos(c.rot * 1.7));
        ctx.fillRect(-c.tam / 2, -c.tam * 0.3 * fl, c.tam, c.tam * 0.6 * fl + 1);
        ctx.restore();
      } else if (c.tipo === 'brasa') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = vida;
        ctx.strokeStyle = c.color;
        ctx.lineWidth = c.tam;
        ctx.beginPath(); ctx.moveTo(c.px - c.vx * 0.04, c.py - c.vy * 0.04); ctx.lineTo(c.x, c.y); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.globalCompositeOperation = c.tipo === 'chispa' ? 'lighter' : 'source-over';
        ctx.globalAlpha = vida;
        ctx.fillStyle = c.color;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.tam * (c.tipo === 'chispa' ? 0.5 + vida : 1), 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Fuegos artificiales ----------
  function lanzarFuegos(segundos) { fuegosHasta = Math.max(fuegosHasta, e.t + segundos); proximoCohete = e.t + 0.2; }
  function moverFuegos(dt) {
    var W = e.ancho, H = e.alto, u = e.u;
    if (e.t < fuegosHasta && e.t >= proximoCohete) {
      proximoCohete = e.t + 0.35 + Math.random() * 0.6;
      var x = W * (0.25 + Math.random() * 0.6);
      var hor = planoAPantalla(0, S.plano.horizonte)[1];
      cohetes.push({ x: x, y: hor, vx: (Math.random() - 0.5) * 60 * u, vy: -(520 + Math.random() * 260) * u, objetivo: H * (0.1 + Math.random() * 0.28), color: COLORES[Math.floor(Math.random() * COLORES.length)] });
    }
    for (var i = cohetes.length - 1; i >= 0; i--) {
      var c = cohetes[i];
      c.x += c.vx * dt; c.y += c.vy * dt;
      partCielo.push({ x: c.x, y: c.y, vx: 0, vy: 30 * u, vida: 0, max: 0.4, tipo: 'chispa', color: '#ffe6b0', tam: 1.4 * u });
      if (c.y <= c.objetivo) {
        cohetes.splice(i, 1);
        var n = 70, vel = (180 + Math.random() * 120) * u, color2 = Math.random() < 0.5 ? '#ffffff' : c.color;
        for (var k = 0; k < n; k++) {
          var a = (k / n) * TAU + Math.random() * 0.1, v = vel * (0.75 + Math.random() * 0.3);
          partCielo.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0, max: 1.3 + Math.random() * 0.6, tipo: 'brasa', color: k % 3 ? c.color : color2, tam: 2.2 * u });
        }
        partCielo.push({ x: c.x, y: c.y, vx: 0, vy: 0, vida: 0, max: 0.25, tipo: 'chispa', color: '#ffffff', tam: 30 * u });
      }
    }
  }

  // ---------- Aurora ----------
  function crearTira() {
    var c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 256, 0, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.12, '#3dffa6'); g.addColorStop(0.35, '#3dffa6');
    g.addColorStop(0.7, '#a05cff'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
    return c;
  }
  function dibujarAurora(ctx) {
    if (aurora.alfa < 0.01) return;
    if (!tira) tira = crearTira();
    var W = e.ancho, H = e.alto, u = e.u, t = e.t * (e.reducido ? 0.3 : 1), esc = e.escala;
    var paso = 10 * u;
    ctx.globalCompositeOperation = 'lighter';
    for (var k = 0; k < 2; k++) {
      var base = H * (0.2 + k * 0.08), alto = H * (0.2 - k * 0.04);
      for (var x = -paso; x < W + paso; x += paso) {
        var yb = base + H * 0.05 * Math.sin(x * 0.0017 + t * (0.12 + k * 0.05) + k * 2) + H * 0.025 * Math.sin(x * 0.0043 - t * 0.08);
        var pl = 0.5 + 0.5 * Math.sin(x * (0.009 + k * 0.003) + t * 0.3 + Math.sin(x * 0.002 + t * 0.2) * 3);
        var al = aurora.alfa * (0.1 + 0.45 * pl * pl);
        al *= F.limitar((Math.abs(x - luna[0]) - W * 0.06) / (W * 0.12), 0, 1); // no tapar la luna
        var h = alto * (0.6 + 0.4 * Math.sin(x * 0.003 + t * 0.15 + k));
        var x0 = Math.round(x * esc) / esc, x1 = Math.round((x + paso) * esc) / esc;
        ctx.globalAlpha = Math.min(1, al);
        ctx.drawImage(tira, x0, yb - h, x1 - x0, h);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- Bucle principal ----------
  function dibujar(e, dt) {
    var W = e.ancho, H = e.alto, u = e.u, t = e.t, p = e.puntero;

    // viento: suave y cambiante, con ráfagas de vez en cuando
    if (!rafaga && t > proximaRafaga) rafaga = { t0: t, dur: 3 + Math.random() * 3, f: (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 90) * u };
    var extra = 0;
    if (rafaga) {
      var pr = (t - rafaga.t0) / rafaga.dur;
      if (pr >= 1) { rafaga = null; proximaRafaga = t + 18 + Math.random() * 25; }
      else extra = rafaga.f * Math.sin(pr * Math.PI);
    }
    viento = 16 * u * Math.sin(t * 0.07) + 9 * u * Math.sin(t * 0.19 + 2) + extra;

    actualizarParallax(dt);
    actualizarFoco();

    // brillo general según cuántas luces hay encendidas
    var encendidas = 0;
    for (var q = 0; q < luces.length; q++) if (luces[q].encendida || arbolEncendidoSolo()) encendidas++;
    var objetivoBrillo = luces.length ? encendidas / luces.length : 1;
    brilloArbol += (objetivoBrillo - brilloArbol) * Math.min(1, dt * 2);
    if (Math.abs(brilloArbol - brilloAplicado) > 0.004) {
      brilloAplicado = brilloArbol;
      document.getElementById('plano').style.filter = 'brightness(' + (0.78 + 0.22 * brilloArbol).toFixed(3) + ')';
      e.capas.arbol.canvas.style.filter = 'brightness(' + (0.72 + 0.33 * brilloArbol).toFixed(3) + ') saturate(' + (0.85 + 0.25 * brilloArbol).toFixed(3) + ')';
    }
    if ((completo || arbolEncendidoSolo()) && t > proximoPatron) { proximoPatron = t + 25; patron = (patron + 1) % (J.arcoirisDesbloqueado() ? 3 : 2); }
    if (aurora.hasta && t > aurora.hasta) { aurora.hasta = 0; aurora.objetivo = completo ? 0.55 : 0; }
    aurora.alfa += (aurora.objetivo - aurora.alfa) * Math.min(1, dt * 0.5);

    dibujarCielo(e.capas.cielo.ctx, dt);
    dibujarLuces(e.capas.luces.ctx, dt);
    dibujarFrente(e.capas.frente.ctx, dt);

    if (!avisoInicial && t > 4 && !EDITAR && !arbolEncendidoSolo() && J.lucesDeHoy().length === 0 && luces.length) {
      avisoInicial = true;
      aviso(J.texto('enciende'), 6);
    }
  }

  function actualizarParallax(dt) {
    var p = e.puntero, W = e.ancho, H = e.alto, u = e.u;
    var amp = EDITAR || e.reducido ? 0 : F.limitar(Number(e.ajustes.parallax), 0, 100) / 100 * 34 * u;
    var tx = 0, ty = 0;
    if (p.activo) { tx = -(p.x / W - 0.5) * 2 * amp; ty = -(p.y / H - 0.5) * 2 * amp * 0.6; }
    else { tx = Math.sin(e.t * 0.11) * amp * 0.35; ty = Math.sin(e.t * 0.07) * amp * 0.2; }
    var k = Math.min(1, dt * 3);
    off.x += (tx - off.x) * k; off.y += (ty - off.y) * k;
    var clave = off.x.toFixed(1) + ',' + off.y.toFixed(1);
    if (clave === ultimoTransform) return;
    ultimoTransform = clave;
    function tr(c) { return 'translate3d(' + (off.x * c.p).toFixed(2) + 'px,' + (off.y * c.p).toFixed(2) + 'px,0) scale(' + c.s + ')'; }
    document.getElementById('plano').style.transform = tr(CAPAS.cielo);
    for (var n in CAPAS) e.capas[n].canvas.style.transform = tr(CAPAS[n]);
  }

  function dibujarCielo(ctx, dt) {
    var W = e.ancho, H = e.alto, u = e.u, t = e.t;
    ctx.clearRect(0, 0, W, H);
    dibujarAurora(ctx);
    dibujarAldea(ctx, dt);

    // estrellas fugaces
    proximaFugaz -= dt;
    if (lluviaEstrellas > 0) { lluviaEstrellas -= dt; if (Math.random() < dt * 3) nuevaFugaz(); }
    if (proximaFugaz <= 0) { proximaFugaz = 14 + Math.random() * 26; if (!e.reducido) nuevaFugaz(); }
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    for (var f = fugaces.length - 1; f >= 0; f--) {
      var fu = fugaces[f];
      fu.vida -= dt * 1.2;
      if (fu.vida <= 0) { fugaces.splice(f, 1); continue; }
      fu.x += fu.vx * dt; fu.y += fu.vy * dt;
      var g = ctx.createLinearGradient(fu.x, fu.y, fu.x - fu.vx * 0.13, fu.y - fu.vy * 0.13);
      g.addColorStop(0, fu.dorada ? 'rgba(255,215,110,' + fu.vida.toFixed(3) + ')' : 'rgba(255,255,255,' + fu.vida.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(160,210,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = (fu.dorada ? 3 : 2.2) * u;
      ctx.beginPath(); ctx.moveTo(fu.x, fu.y); ctx.lineTo(fu.x - fu.vx * 0.13, fu.y - fu.vy * 0.13); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    // trineo cruzando la luna
    if (J.desbloqueado('trineo') || trineo.activo) {
      trineo.proximo -= dt;
      if (!trineo.activo && trineo.proximo <= 0 && J.desbloqueado('trineo')) { trineo.activo = true; trineo.t = 0; }
      if (trineo.activo) dibujarTrineo(ctx, dt);
    }

    moverFuegos(dt);
    dibujarParticulas(ctx, partCielo, dt);

    // nieve lejana
    moverNieve(nieveLejos, dt, 0.3, e.puntero, 'cielo', false);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    for (var i = 0; i < nieveLejos.length; i++) { var c = nieveLejos[i]; ctx.moveTo(c.x + c.r, c.y); ctx.arc(c.x, c.y, c.r, 0, TAU); }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Humo de las chimeneas y ventanas que titilan (dan vida a la imagen fija de la aldea)
  function dibujarAldea(ctx, dt) {
    var u = e.u, t = e.t, lento = e.reducido ? 0.3 : 1;
    ctx.globalCompositeOperation = 'lighter';
    for (var v = 0; v < ventanas.length; v++) {
      var vn = ventanas[v];
      var k = 0.55 + 0.25 * Math.sin(t * vn.vel + vn.fase) + 0.2 * Math.sin(t * vn.vel * 3.7 + vn.fase * 2);
      ctx.globalAlpha = 0.16 * k;
      var tv = 70 * escPlano;
      ctx.drawImage(BRILLO_CALIDO, vn.x - tv / 2, vn.y - tv / 2, tv, tv);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (var c = 0; c < chimeneas.length; c++) {
      if (Math.random() < dt * 2.2 * lento) {
        humo.push({ x: chimeneas[c][0] + (Math.random() - 0.5) * 6 * escPlano, y: chimeneas[c][1], r: 9 * escPlano, vida: 0, max: 5 + Math.random() * 2 });
      }
    }
    for (var h = humo.length - 1; h >= 0; h--) {
      var hu = humo[h];
      hu.vida += dt;
      if (hu.vida > hu.max) { humo.splice(h, 1); continue; }
      var p = hu.vida / hu.max;
      hu.y -= 26 * escPlano * dt * lento;
      hu.x += (viento * 0.25 + Math.sin(t * 0.8 + h) * 6 * escPlano) * dt * lento;
      hu.r += 9 * escPlano * dt;
      ctx.globalAlpha = 0.22 * Math.sin(p * Math.PI) * (1 - p * 0.5);
      var d = hu.r * 2.6;
      ctx.drawImage(COPO_SUAVE, hu.x - d / 2, hu.y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
  }

  function nuevaFugaz() {
    var W = e.ancho, H = e.alto, u = e.u;
    var x = W * (0.15 + Math.random() * 0.7), y = H * (0.04 + Math.random() * 0.25);
    var ang = Math.PI * (0.8 + Math.random() * 0.12), vel = (900 + Math.random() * 500) * u;
    if (x < W * 0.35) ang = Math.PI - ang;
    fugaces.push({ x: x, y: y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, vida: 1, dorada: J.desbloqueado('estrellasDoradas') && Math.random() < 0.4 });
  }

  function dibujarTrineo(ctx, dt) {
    var W = e.ancho, H = e.alto, u = e.u;
    var dur = 11;
    trineo.t += dt / dur;
    if (trineo.t >= 1) { trineo.activo = false; trineo.proximo = 70 + Math.random() * 80; return; }
    var k = trineo.t;
    var x = F.mezclar(luna[0] - W * 0.32, luna[0] + W * 0.5, k);
    var y = luna[1] + H * 0.09 - k * H * 0.17 + Math.sin(k * TAU * 2) * 6 * u;
    var im = img.trineo;
    var ancho = W * 0.1, alto = im ? ancho * im.height / im.width : ancho * 0.4;
    var alfa = Math.min(1, Math.min(k, 1 - k) * 8);
    ctx.globalAlpha = alfa;
    if (im) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.12);
      ctx.drawImage(im, -ancho / 2, -alto / 2, ancho, alto);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (Math.random() < 0.8) partCielo.push({ x: x - ancho * 0.45, y: y + alto * 0.2, vx: -20 * u, vy: 10 * u, vida: 0, max: 1.2, tipo: 'chispa', color: '#ffe9a8', tam: 2 * u });
  }

  function dibujarLuces(ctx, dt) {
    var W = e.ancho, H = e.alto, u = e.u, t = e.t;
    var lento = e.reducido ? 0.3 : 1;
    var solo = arbolEncendidoSolo();
    ctx.clearRect(0, 0, W, H);

    // resplandor cálido del árbol según cuántas luces hay
    if (brilloArbol > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32 * brilloArbol;
      var tg = caja.h * 1.05;
      ctx.drawImage(BRILLO_CALIDO, caja.x0 + caja.w / 2 - tg / 2, caja.y0 + caja.h * 0.55 - tg / 2, tg, tg);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // adornos ganados en el calendario de adviento
    var nAd = Math.min(J.adornosGanados(), adornos.length);
    for (var a = 0; a < nAd && SPR_ADORNOS.length; a++) {
      var ad = adornos[a], im = img[SPR_ADORNOS[a % SPR_ADORNOS.length]];
      if (!im) continue;
      ad.vel += (-30 * ad.ang - 2 * ad.vel + viento * 0.004 / u) * dt;
      ad.ang += ad.vel * dt;
      var ah = caja.h * 0.05, aw = ah * im.width / im.height;
      ctx.save();
      ctx.translate(ad.x, ad.y);
      ctx.rotate(ad.ang * 0.4 + Math.sin(t * 1.3 + ad.fase) * 0.04 * lento);
      ctx.drawImage(im, -aw / 2, 0, aw, ah);
      ctx.restore();
    }

    // bombillas
    var hueTiempo = t * 0.8;
    for (var i = 0; i < luces.length; i++) {
      var l = luces[i];
      var encendida = l.encendida || solo;
      if (!encendida) continue;
      l.pop = Math.max(0, l.pop - dt * 2.2);
      var k;
      if (completo || solo) {
        if (patron === 1) k = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * 3 * lento - i * 0.5), 2);
        else k = 0.75 + 0.25 * Math.sin(t * 2.2 * lento + l.fase);
      } else k = 0.85 + 0.15 * Math.sin(t * 3 * lento + l.fase);
      k += l.pop * 0.8 + celebracion * 0.25;
      var col = patron === 2 ? Math.floor((i * 0.4 + hueTiempo) % COLORES.length) : l.color;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, 0.13 * k);
      var tb = l.r * 20;
      ctx.drawImage(BRILLOS[col], l.x - tb / 2, l.y - tb / 2, tb, tb);
      ctx.globalAlpha = Math.min(1, 0.75 * k);
      tb = l.r * (6 + l.pop * 6);
      ctx.drawImage(BRILLOS[col], l.x - tb / 2, l.y - tb / 2, tb, tb);
      ctx.globalAlpha = Math.min(1, k);
      tb = l.r * 3.2;
      ctx.drawImage(BRILLO_BLANCO, l.x - tb / 2, l.y - tb / 2, tb, tb);
      ctx.globalCompositeOperation = 'source-over';
      if (l.pop > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (l.pop * 0.8).toFixed(3) + ')';
        ctx.lineWidth = 2 * u;
        ctx.beginPath(); ctx.arc(l.x, l.y, l.r * (2 + (1 - l.pop) * 5), 0, TAU); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // pista: de vez en cuando una bombilla apagada destella para invitar a tocarla
    if (!completo && !solo && luces.length && !EDITAR) {
      if (t > pista.proxima) {
        var apagadas = luces.filter(function (x) { return !x.encendida; });
        if (apagadas.length) { pista.i = apagadas[Math.floor(Math.random() * apagadas.length)].i; pista.t0 = t; }
        pista.proxima = t + 3 + Math.random() * 2;
      }
      var pl = luces[pista.i];
      if (pl && !pl.encendida && t - pista.t0 < 1.1) {
        var pp = (t - pista.t0) / 1.1, s = Math.sin(pp * Math.PI);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = s * 0.9;
        destello4(ctx, pl.x, pl.y, pl.r * 3.2 * s, '#ffffff');
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // estrella
    estrella.destello = Math.max(0, estrella.destello - dt * 0.6);
    celebracion = Math.max(0, celebracion - dt * 0.25);
    var imE = img.estrella, enArbol = !!S.arbol.estrellaEnArbol;
    if (imE || enArbol) {
      var eh = estrella.h * (1 + estrella.destello * 0.15), ew = imE ? eh * imE.width / imE.height : eh;
      if (completo || solo) {
        var pulso = 0.85 + 0.15 * Math.sin(t * 2) + estrella.destello * 0.6;
        ctx.globalCompositeOperation = 'lighter';
        ctx.save();
        ctx.translate(estrella.x, estrella.y);
        ctx.rotate(t * 0.15 * lento);
        for (var r = 0; r < 8; r++) {
          ctx.rotate(TAU / 8);
          var gr = ctx.createLinearGradient(0, 0, eh * 1.7 * pulso, 0);
          gr.addColorStop(0, 'rgba(255,236,170,0.55)'); gr.addColorStop(1, 'rgba(255,236,170,0)');
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.moveTo(0, -eh * 0.05); ctx.lineTo(eh * 1.7 * pulso, 0); ctx.lineTo(0, eh * 0.05); ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = 0.9;
        var tb2 = eh * 3.5 * pulso;
        ctx.drawImage(BRILLO_CALIDO, estrella.x - tb2 / 2, estrella.y - tb2 / 2, tb2, tb2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        if (!enArbol) ctx.drawImage(imE, estrella.x - ew / 2, estrella.y - eh / 2, ew, eh);
      } else if (!enArbol) {
        ctx.filter = 'grayscale(0.7) brightness(0.6)';
        ctx.drawImage(imE, estrella.x - ew / 2, estrella.y - eh / 2, ew, eh);
        ctx.filter = 'none';
      }
    }

    // regalos
    for (var g = 0; g < regalos.length; g++) dibujarRegalo(ctx, regalos[g], dt);

    dibujarParticulas(ctx, partLuces, dt);
    dibujarAnillo(ctx, 'luces');
  }

  function destello4(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  function dibujarRegalo(ctx, g, dt) {
    var u = e.u, t = e.t;
    var im = g.sprite ? img[g.sprite] : null;
    var bote = g.hoy && !g.abriendo ? Math.abs(Math.sin(t * 2.2)) * g.h * 0.06 : 0;
    var esc = 1, alfa = 1, sube = 0;
    if (g.abriendo) {
      g.abriendo = Math.min(1, g.abriendo + dt * 1.6);
      esc = 1 + g.abriendo * 0.25; alfa = 1 - g.abriendo; sube = g.abriendo * g.h * 0.4;
      if (g.abriendo >= 1) return;
    }
    if (g.dia !== null && !g.abriendo) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (g.hoy ? 0.45 : 0.25) * (0.7 + 0.3 * Math.sin(t * 2 + g.fase));
      var tb = g.h * 2;
      ctx.drawImage(BRILLO_DORADO, g.x - tb / 2, g.y - g.h * 0.45 - tb / 2, tb, tb);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = alfa;
    if (im) {
      var w = g.w * esc, h = g.h * esc;
      ctx.drawImage(im, g.x - w / 2, g.y - h - bote - sube, w, h);
    }
    ctx.globalAlpha = 1;
    if (g.dia !== null && !g.abriendo) {
      var rx = g.x + g.w * 0.38, ry = g.y - g.h * 0.92 - bote, rr = Math.max(9 * u, g.h * 0.13);
      ctx.fillStyle = g.hoy ? '#ffd24a' : 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(rx, ry, rr, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1b2440';
      ctx.font = '700 ' + Math.round(rr * 1.15) + 'px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(g.dia), rx, ry + rr * 0.05);
      if (g.hoy && Math.random() < dt * 4) chispas(partLuces, g.x + (Math.random() - 0.5) * g.w, g.y - g.h * Math.random(), '#fff2b0', 1, 40);
    }
  }

  function dibujarFrente(ctx, dt) {
    var W = e.ancho, H = e.alto, u = e.u, t = e.t, p = e.puntero;
    ctx.clearRect(0, 0, W, H);

    // ondas de los clics
    for (var o = ondas.length - 1; o >= 0; o--) {
      var on = ondas[o];
      on.r += 520 * u * dt; on.vida -= dt * 1.6;
      if (on.vida <= 0) { ondas.splice(o, 1); continue; }
      ctx.strokeStyle = 'rgba(255,255,255,' + (on.vida * 0.3).toFixed(3) + ')';
      ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.arc(on.x, on.y, on.r, 0, TAU); ctx.stroke();
    }

    // nieve media
    moverNieve(nieveMedio, dt, 0.7, p, 'frente', true);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (var i = 0; i < nieveMedio.length; i++) { var c = nieveMedio[i]; ctx.moveTo(c.x + c.r, c.y); ctx.arc(c.x, c.y, c.r, 0, TAU); }
    ctx.fill();
    ctx.globalAlpha = 1;

    // copos dorados
    proximoCopo -= dt;
    if (nieveDorada > 0) { nieveDorada -= dt; if (Math.random() < dt * 1.4) nuevoCopo(); }
    if (proximoCopo <= 0 && !EDITAR) { proximoCopo = 45 + Math.random() * 60; nuevoCopo(); }
    for (var k = copos.length - 1; k >= 0; k--) {
      var cd = copos[k];
      cd.fase += dt;
      cd.x += (Math.sin(cd.fase * 0.9) * 30 * u + viento * 0.5) * dt;
      cd.y += cd.v * dt;
      cd.rot += dt * 0.6;
      if (cd.y > H + cd.tam) { copos.splice(k, 1); continue; }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 4 + cd.fase);
      var tb = cd.tam * 3.4;
      ctx.drawImage(BRILLO_DORADO, cd.x - tb / 2, cd.y - tb / 2, tb, tb);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      var im = img['copo-dorado'];
      ctx.save();
      ctx.translate(cd.x, cd.y); ctx.rotate(cd.rot);
      if (im) ctx.drawImage(im, -cd.tam / 2, -cd.tam / 2, cd.tam, cd.tam * im.height / im.width);
      else { ctx.fillStyle = '#ffd24a'; destello4(ctx, 0, 0, cd.tam / 2, '#ffd24a'); }
      ctx.restore();
      if (Math.random() < dt * 8) partFrente.push({ x: cd.x, y: cd.y, vx: (Math.random() - 0.5) * 30 * u, vy: 20 * u, vida: 0, max: 0.8, tipo: 'chispa', color: '#ffdf7a', tam: 1.6 * u });
    }

    // guirnalda superior (desbloqueo)
    if (bombillasG.length) dibujarGuirnalda(ctx, dt);

    // nieve cercana (grande y desenfocada)
    moverNieve(nieveCerca, dt, 1.2, p, 'frente', true);
    ctx.globalAlpha = 0.55;
    for (var n = 0; n < nieveCerca.length; n++) {
      var cc = nieveCerca[n], d = cc.r * 2.4;
      ctx.drawImage(COPO_SUAVE, cc.x - d / 2, cc.y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;

    dibujarParticulas(ctx, partFrente, dt);
    dibujarAnillo(ctx, 'frente');
    if (EDITAR && editor.datos) dibujarEditor(ctx);
  }

  function nuevoCopo() {
    var W = e.ancho, u = e.u;
    copos.push({ x: W * (0.2 + Math.random() * 0.7), y: -40 * u, v: (34 + Math.random() * 18) * u, tam: 46 * u, fase: Math.random() * TAU, rot: Math.random() * TAU });
  }

  function dibujarGuirnalda(ctx, dt) {
    var u = e.u, t = e.t, p = e.puntero;
    ctx.strokeStyle = '#1b2236';
    ctx.lineWidth = 2.2 * u;
    ctx.beginPath();
    guirnaldas.forEach(function (tr) {
      ctx.moveTo(tr.x0, tr.y);
      ctx.quadraticCurveTo((tr.x0 + tr.x1) / 2, tr.y + tr.caida * 2, tr.x1, tr.y);
    });
    ctx.stroke();
    var pc = p.activo ? aCapa('frente', p.x, p.y) : null;
    for (var i = 0; i < bombillasG.length; i++) {
      var b = bombillasG[i];
      var bx = b.ax + Math.sin(b.ang) * b.largo, by = b.ay + Math.cos(b.ang) * b.largo;
      if (pc && Math.hypot(bx - pc[0], by - pc[1]) < 70 * u) b.vel += F.limitar(p.vx / (90 * u), -30, 30) * dt * 2;
      b.vel += (-26 * Math.sin(b.ang) - 1.6 * b.vel + viento * 0.01 / u) * dt;
      b.ang = F.limitar(b.ang + b.vel * dt, -1.2, 1.2);
      bx = b.ax + Math.sin(b.ang) * b.largo; by = b.ay + Math.cos(b.ang) * b.largo;
      var k = 0.7 + 0.3 * Math.sin(t * 2 + b.fase);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = k * 0.8;
      var tb = 60 * u;
      ctx.drawImage(BRILLOS[b.color], bx - tb / 2, by + 6 * u - tb / 2, tb, tb);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.translate(b.ax, b.ay); ctx.rotate(-b.ang);
      ctx.strokeStyle = '#1b2236'; ctx.lineWidth = 1.5 * u;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, b.largo - 6 * u); ctx.stroke();
      ctx.fillStyle = '#3b4258'; ctx.fillRect(-3.5 * u, b.largo - 8 * u, 7 * u, 7 * u);
      ctx.fillStyle = COLORES[b.color];
      ctx.beginPath(); ctx.ellipse(0, b.largo + 6 * u, 6 * u, 9 * u, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  // Acceso para pruebas desde la consola (no afecta al fondo)
  window.__navidad = {
    get luces() { return luces; }, get regalos() { return regalos; }, get copos() { return copos; },
    desdeCapa: function (c, x, y) { return desdeCapa(c, x, y); }, nuevoCopo: function () { nuevoCopo(); },
    animacion: function (n) { animacion(n); }
  };

  // ---------- Modo editor (index.html?editar=1) ----------
  function iniciarEditor() {
    editor.datos = {
      luces: (S.arbol.luces || []).map(function (p) { return p.slice(); }),
      adornos: (S.arbol.adornos || []).map(function (p) { return p.slice(); }),
      regalos: (S.arbol.regalos || []).map(function (p) { return p.slice(); }),
      estrella: (S.arbol.estrella || [0.5, 0.05, 0.1]).slice()
    };
    var panel = document.createElement('div');
    panel.id = 'editor';
    panel.innerHTML = '<div><b>Editor de la escena</b> · clic: añadir · clic sobre un punto: quitar · Z: deshacer</div>' +
      '<div style="margin:6px 0">' + ['luces', 'adornos', 'regalos', 'estrella'].map(function (m) {
        return '<button data-modo="' + m + '">' + m + '</button>';
      }).join('') + '<button id="ed-copiar">Copiar</button></div><textarea readonly></textarea>';
    document.body.appendChild(panel);
    panel.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
    panel.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
    panel.querySelectorAll('button[data-modo]').forEach(function (b) {
      b.addEventListener('click', function () { editor.modo = b.dataset.modo; pintarPanel(); });
    });
    document.getElementById('ed-copiar').addEventListener('click', function () {
      var ta = panel.querySelector('textarea'); ta.select();
      try { navigator.clipboard.writeText(ta.value); } catch (err) { document.execCommand('copy'); }
    });
    window.addEventListener('keydown', function (ev) {
      if (ev.key === 'z' || ev.key === 'Z') { var l = editor.datos[editor.modo]; if (Array.isArray(l) && Array.isArray(l[0])) l.pop(); pintarPanel(); }
    });
    pintarPanel();
  }
  function redondear(p) { return p.map(function (v) { return Math.round(v * 10000) / 10000; }); }
  function pintarPanel() {
    var panel = document.getElementById('editor');
    if (!panel) return;
    panel.querySelectorAll('button[data-modo]').forEach(function (b) { b.classList.toggle('activo', b.dataset.modo === editor.modo); });
    var d = editor.datos;
    panel.querySelector('textarea').value =
      '    luces: ' + JSON.stringify(d.luces.map(redondear)) + ',\n\n' +
      '    estrella: ' + JSON.stringify(redondear(d.estrella)) + ',\n\n' +
      '    adornos: ' + JSON.stringify(d.adornos.map(redondear)) + ',\n\n' +
      '    regalos: ' + JSON.stringify(d.regalos.map(redondear));
    window.__escenaEditada = d;
  }
  function tocarEditor(x, y) {
    var q = pantallaAArbol(x, y), d = editor.datos, m = editor.modo;
    if (m === 'estrella') { d.estrella = [q[0], q[1], d.estrella[2] || 0.1]; pintarPanel(); return; }
    var lista = d[m];
    for (var i = 0; i < lista.length; i++) {
      var s = arbolAPantalla(lista[i][0], lista[i][1]);
      if (Math.hypot(s[0] - x, s[1] - y) < 12) { lista.splice(i, 1); pintarPanel(); return; }
    }
    lista.push(m === 'regalos' ? [q[0], q[1], 0.12] : [q[0], q[1]]);
    pintarPanel();
  }
  function dibujarEditor(ctx) {
    var d = editor.datos, u = e.u;
    ctx.lineWidth = 1.5;
    ctx.font = '11px Consolas, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    d.luces.forEach(function (p, i) {
      var s = arbolAPantalla(p[0], p[1]);
      ctx.strokeStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(s[0], s[1], 7, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ffd24a'; ctx.fillText(String(i), s[0] + 8, s[1] - 6);
    });
    d.adornos.forEach(function (p, i) {
      var s = arbolAPantalla(p[0], p[1]);
      ctx.strokeStyle = '#7ad7ff'; ctx.strokeRect(s[0] - 6, s[1] - 6, 12, 12);
      ctx.fillStyle = '#7ad7ff'; ctx.fillText('a' + i, s[0] + 8, s[1] + 4);
    });
    d.regalos.forEach(function (p) {
      var s = arbolAPantalla(p[0], p[1]), h = p[2] * caja.h;
      ctx.strokeStyle = '#ff7be5'; ctx.strokeRect(s[0] - h / 2, s[1] - h, h, h);
    });
    var es = arbolAPantalla(d.estrella[0], d.estrella[1]);
    ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(es[0], es[1], 12, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.strokeRect(caja.x0, caja.y0, caja.w, caja.h);
  }
})();
