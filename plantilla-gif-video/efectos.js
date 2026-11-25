/*
 * efectos.js · Fondos Dinámicos (MIT)
 * Efectos de partículas para poner encima de cualquier imagen, GIF o vídeo.
 * Todos reaccionan al ratón (se apartan o, las luciérnagas, se acercan) y a los clics.
 *
 * Efectos disponibles (el número es el que usa el menú de Lively):
 *   0 ninguno · 1 nieve · 2 hojas · 3 petalos · 4 burbujas · 5 luciernagas
 *   6 estrellas · 7 confeti · 8 corazones
 */
(function (global) {
  'use strict';
  var F = global.FondosDinamicos;
  var TAU = Math.PI * 2;

  var NOMBRES = ['ninguno', 'nieve', 'hojas', 'petalos', 'burbujas', 'luciernagas', 'estrellas', 'confeti', 'corazones'];

  // ---------- Dibujos (se crean una sola vez, la primera vez que se usan) ----------
  var cache = {};
  function sprites(nombre) {
    if (cache[nombre]) return cache[nombre];
    var lista = [];
    if (nombre === 'hojas') {
      ['#e2432b', '#f07c22', '#f5b331', '#b8321f', '#c9a227'].forEach(function (col, i) {
        lista.push(F.sprite(64, function (ctx, t) {
          ctx.translate(t / 2, t / 2);
          ctx.fillStyle = col;
          ctx.beginPath();
          var R = t * 0.44;
          for (var k = 0; k <= 160; k++) {
            var a = (k / 160) * TAU;
            var r = i % 2 ? R * (0.42 + 0.58 * Math.pow(Math.abs(Math.cos((a + Math.PI / 2) * 2.5)), 0.6)) * (1 + 0.07 * Math.sin(a * 25))
                          : R * (0.35 + 0.65 * Math.pow(Math.abs(Math.sin(a / 2 + Math.PI / 4)), 1.5));
            var x = Math.cos(a - Math.PI / 2) * r, y = Math.sin(a - Math.PI / 2) * r;
            if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.fill();
          ctx.strokeStyle = 'rgba(90,30,10,0.45)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(0, -R * 0.8); ctx.lineTo(0, R); ctx.stroke();
        }));
      });
    } else if (nombre === 'petalos') {
      ['#ffc6d9', '#ffb0c8', '#ffd9e6', '#f7a1bf'].forEach(function (col) {
        lista.push(F.sprite(64, function (ctx, t) {
          ctx.translate(t / 2, t / 2);
          var g = ctx.createLinearGradient(0, -t * 0.4, 0, t * 0.4);
          g.addColorStop(0, '#fff2f6'); g.addColorStop(1, col);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(0, t * 0.4);
          ctx.bezierCurveTo(t * 0.38, t * 0.1, t * 0.28, -t * 0.38, t * 0.06, -t * 0.36);
          ctx.lineTo(0, -t * 0.28);
          ctx.lineTo(-t * 0.06, -t * 0.36);
          ctx.bezierCurveTo(-t * 0.28, -t * 0.38, -t * 0.38, t * 0.1, 0, t * 0.4);
          ctx.fill();
        }));
      });
    } else if (nombre === 'burbujas') {
      lista.push(F.sprite(128, function (ctx, t) {
        var c = t / 2, r = t / 2 - 3;
        var f = ctx.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.1, c, c, r);
        f.addColorStop(0, 'rgba(255,255,255,0.08)'); f.addColorStop(1, 'rgba(200,240,255,0.3)');
        ctx.fillStyle = f; ctx.beginPath(); ctx.arc(c, c, r, 0, TAU); ctx.fill();
        var b = ctx.createLinearGradient(0, 0, t, t);
        b.addColorStop(0, 'rgba(255,170,220,0.9)'); b.addColorStop(0.5, 'rgba(170,240,255,0.9)'); b.addColorStop(1, 'rgba(255,240,160,0.9)');
        ctx.strokeStyle = b; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(c, c, r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(c, c, r * 0.72, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
      }));
    } else if (nombre === 'luciernagas') {
      lista.push(F.brillo('#e8ff8a', 64));
      lista.push(F.brillo('#ffe27a', 64));
    } else if (nombre === 'estrellas') {
      ['#ffffff', '#fff1b8', '#cfe8ff'].forEach(function (col) {
        lista.push(F.sprite(64, function (ctx, t) {
          var c = t / 2;
          var g = ctx.createRadialGradient(c, c, 0, c, c, c);
          g.addColorStop(0, col); g.addColorStop(0.15, col); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          for (var k = 0; k < 8; k++) {
            var a = (k / 8) * TAU, r = k % 2 ? c * 0.16 : c;
            ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
          }
          ctx.fill();
        }));
      });
    } else if (nombre === 'corazones') {
      ['#ff4d6d', '#ff8fab', '#e5383b', '#ffb3c6'].forEach(function (col) {
        lista.push(F.sprite(64, function (ctx, t) {
          ctx.translate(t / 2, t / 2 + t * 0.04);
          var s = t * 0.42;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(0, s * 0.85);
          ctx.bezierCurveTo(-s * 1.25, s * 0.05, -s * 0.6, -s * 0.95, 0, -s * 0.35);
          ctx.bezierCurveTo(s * 0.6, -s * 0.95, s * 1.25, s * 0.05, 0, s * 0.85);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.beginPath(); ctx.ellipse(-s * 0.42, -s * 0.28, s * 0.14, s * 0.22, -0.6, 0, TAU); ctx.fill();
        }));
      });
    }
    cache[nombre] = lista;
    return lista;
  }

  var COLORES_CONFETI = ['#ff4d4d', '#ffd23f', '#3fe07a', '#3fb2ff', '#ff6ee0', '#ffffff'];

  // Cómo se mueve y cuántas hay de cada efecto (para cantidad = 50)
  var TIPOS = {
    nieve:       { n: 300, mov: 'cae',  vel: [20, 75],  tam: [1, 3.6],  repele: 1 },
    hojas:       { n: 45,  mov: 'cae',  vel: [40, 75],  tam: [20, 36],  repele: 1, gira: true },
    petalos:     { n: 70,  mov: 'cae',  vel: [25, 55],  tam: [18, 30],  repele: 1, gira: true, deriva: 30 },
    burbujas:    { n: 26,  mov: 'sube', vel: [18, 45],  tam: [14, 46],  repele: 1 },
    luciernagas: { n: 50,  mov: 'vaga', vel: [8, 26],   tam: [18, 34],  repele: -0.6, brilla: true },
    estrellas:   { n: 70,  mov: 'vaga', vel: [3, 10],   tam: [14, 32],   repele: 0.6, brilla: true },
    confeti:     { n: 120, mov: 'cae',  vel: [45, 95],  tam: [6, 12],   repele: 1, gira: true },
    corazones:   { n: 30,  mov: 'sube', vel: [20, 45],  tam: [16, 34],  repele: 1 }
  };

  function nombreDe(valor) {
    if (typeof valor === 'number' || (typeof valor === 'string' && valor !== '' && !isNaN(valor))) {
      return NOMBRES[Number(valor)] || 'ninguno';
    }
    valor = String(valor || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return NOMBRES.indexOf(valor) >= 0 ? valor : 'ninguno';
  }

  function crear(e) {
    var tipo = 'ninguno', def = null, lista = [], extras = [], imgs = [];

    function nueva(repartida, x, y) {
      var W = e.ancho, H = e.alto, u = e.u * tamano();
      var z = 0.4 + Math.pow(Math.random(), 1.5) * 0.6;
      var p = {
        x: x !== undefined ? x : Math.random() * W,
        y: y !== undefined ? y : (repartida ? Math.random() * H : def.mov === 'sube' ? H + 50 * u : def.mov === 'cae' ? -50 * u : Math.random() * H),
        z: z, px: 0, py: 0,
        tam: F.azar(def.tam[0], def.tam[1]) * u * (0.6 + z * 0.4),
        vel: F.azar(def.vel[0], def.vel[1]) * e.u * z,
        fase: Math.random() * TAU, rot: Math.random() * TAU, vrot: F.azar(-2, 2),
        giro: Math.random() * TAU, vgiro: F.azar(1.5, 4),
        dir: Math.random() * TAU,
        img: imgs.length ? imgs[Math.floor(Math.random() * imgs.length)] : null,
        color: COLORES_CONFETI[Math.floor(Math.random() * COLORES_CONFETI.length)]
      };
      return p;
    }

    function tamano() { return F.limitar(Number(e.ajustes.tamano) || 100, 30, 300) / 100; }
    function objetivo() {
      if (!def) return 0;
      return Math.round(def.n * (F.limitar(Number(e.ajustes.cantidad), 0, 100) / 50) * (e.reducido ? 0.35 : 1));
    }

    function poner(valor) {
      var n = nombreDe(valor);
      if (n === tipo) return;
      tipo = n; def = TIPOS[n] || null;
      imgs = def ? sprites(n) : [];
      lista = []; extras = [];
      ajustar(true);
    }

    function ajustar(repartir) {
      var obj = objetivo();
      while (lista.length < obj) lista.push(nueva(repartir !== false));
      if (lista.length > obj) lista.length = obj;
    }

    function tocar(x, y) {
      if (!def) return;
      var cuantas = e.reducido ? 6 : 18;
      for (var i = 0; i < cuantas; i++) {
        var p = nueva(false, x, y);
        var a = Math.random() * TAU, v = F.azar(120, 380) * e.u;
        p.px = Math.cos(a) * v; p.py = Math.sin(a) * v;
        p.vida = F.azar(1.5, 3);
        extras.push(p);
      }
      if (extras.length > 300) extras.splice(0, extras.length - 300);
    }

    function moverUna(p, dt, W, H, u, t, pt, fuerza, R, amort, lento) {
      if (pt.activo && fuerza !== 0) {
        var dx = p.x - pt.x, dy = p.y - pt.y, d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          var d = Math.sqrt(d2) || 1, k = 1 - d / R;
          var emp = k * k * 1800 * u * fuerza * def.repele * dt;
          p.px += (dx / d) * emp + (def.repele > 0 ? pt.vx * k * 1.8 * dt : 0);
          p.py += (dy / d) * emp + (def.repele > 0 ? pt.vy * k * 1.8 * dt : 0);
        }
      }
      p.px *= amort; p.py *= amort;
      p.fase += dt * (0.8 + p.z);
      var vx = 0, vy = 0;
      if (def.mov === 'cae') {
        vy = p.vel; vx = Math.sin(p.fase) * (def.deriva || 14) * u * p.z + (def.deriva ? def.deriva * 0.6 * u : 0);
      } else if (def.mov === 'sube') {
        vy = -p.vel; vx = Math.sin(p.fase) * 16 * u;
      } else {
        p.dir += F.azar(-1.5, 1.5) * dt;
        vx = Math.cos(p.dir) * p.vel; vy = Math.sin(p.dir) * p.vel;
      }
      p.x += vx * dt * lento + p.px * dt;
      p.y += vy * dt * lento + p.py * dt;
      if (def.gira) { p.rot += p.vrot * dt * lento; p.giro += p.vgiro * dt * lento; }
      var m = p.tam + 20 * u;
      if (p.vida === undefined) {
        if (p.y > H + m) { p.y = def.mov === 'vaga' ? -m : -m; p.x = Math.random() * W; }
        else if (p.y < -m - (def.mov === 'sube' ? 0 : 200 * u)) { p.y = H + m; p.x = Math.random() * W; }
        if (p.x < -m) p.x += W + 2 * m; else if (p.x > W + m) p.x -= W + 2 * m;
      }
    }

    function dibujarUna(ctx, p, t, esc) {
      var s = p.tam;
      if (tipo === 'nieve') return; // la nieve se dibuja en bloque
      if (tipo === 'confeti') {
        var cs = Math.cos(p.rot), sn = Math.sin(p.rot), fl = Math.cos(p.giro);
        ctx.setTransform(esc * cs, esc * sn, -esc * sn * fl, esc * cs * fl, esc * p.x, esc * p.y);
        ctx.fillStyle = p.color;
        ctx.fillRect(-s / 2, -s / 4, s, s / 2);
        return;
      }
      if (def.brilla) {
        var pulso = tipo === 'luciernagas' ? 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * 1.6 + p.fase * 3)), 2) : 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + p.fase * 5));
        ctx.globalAlpha *= pulso;
        s *= tipo === 'estrellas' ? 0.6 + pulso * 0.6 : 1;
      }
      if (def.gira) {
        var c = Math.cos(p.rot), n = Math.sin(p.rot), f = Math.cos(p.giro);
        ctx.setTransform(esc * c * f, esc * n * f, -esc * n, esc * c, esc * p.x, esc * p.y);
        ctx.drawImage(p.img, -s / 2, -s / 2, s, s);
      } else {
        ctx.drawImage(p.img, p.x - s / 2, p.y - s / 2, s, s);
      }
    }

    function paso(ctx, dt) {
      if (!def) return;
      var W = e.ancho, H = e.alto, u = e.u, t = e.t, esc = e.escala;
      var lento = (e.reducido ? 0.3 : 1) * F.limitar(Number(e.ajustes.velocidad) || 100, 10, 300) / 100;
      var fuerza = F.limitar(Number(e.ajustes.fuerzaCursor), 0, 100) / 60;
      var R = 150 * u, amort = Math.pow(0.15, dt);
      if (lista.length < objetivo() && Math.random() < dt * 20) lista.push(nueva(false));
      else if (lista.length > objetivo()) lista.length = objetivo();

      if (def.brilla) ctx.globalCompositeOperation = 'lighter';
      var todas = [lista, extras];
      for (var g = 0; g < 2; g++) {
        var arr = todas[g];
        for (var i = arr.length - 1; i >= 0; i--) {
          var p = arr[i];
          moverUna(p, dt, W, H, u, t, e.puntero, fuerza, R, amort, lento);
          if (p.vida !== undefined) {
            p.vida -= dt;
            if (p.vida <= 0) { arr.splice(i, 1); continue; }
          }
          ctx.globalAlpha = (tipo === 'burbujas' || tipo === 'nieve' ? 0.5 + p.z * 0.5 : 0.85 + p.z * 0.15) * (p.vida !== undefined ? Math.min(1, p.vida) : 1);
          dibujarUna(ctx, p, t, esc);
        }
      }
      ctx.setTransform(esc, 0, 0, esc, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (tipo === 'nieve') {
        ctx.fillStyle = '#fff';
        for (var capa = 0; capa < 2; capa++) {
          ctx.globalAlpha = capa ? 0.95 : 0.55;
          ctx.beginPath();
          for (var g2 = 0; g2 < 2; g2++) {
            var a2 = todas[g2];
            for (var j = 0; j < a2.length; j++) {
              var q = a2[j];
              if ((q.z > 0.7 ? 1 : 0) !== capa) continue;
              ctx.moveTo(q.x + q.tam, q.y);
              ctx.arc(q.x, q.y, q.tam, 0, TAU);
            }
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    return { poner: poner, ajustar: ajustar, paso: paso, tocar: tocar, get tipo() { return tipo; } };
  }

  global.Efectos = { nombres: NOMBRES, crear: crear, nombreDe: nombreDe };
})(window);
