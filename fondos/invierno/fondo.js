/*
 * Aurora de invierno · Fondos Dinámicos (MIT)
 * - Aurora boreal que se curva y brilla hacia el ratón, reflejada en un lago helado.
 * - Nieve ligera que se aparta del cursor.
 * - Clic en el cielo: estrella fugaz. Clic abajo: destello de la aurora.
 */
(function () {
  'use strict';
  var F = window.FondosDinamicos;
  var TAU = Math.PI * 2;

  var e = null;
  var cintas = [], nieve = [], fugaces = [], titilantes = [], humo = [], destellos = [];
  var tira = null, tiraReflejo = null, coloresTira = '';
  var lagoY = 0, lagoFin = 0, cabana = { x: 0, y: 0 };
  var proximaFugaz = 12;

  // Tira vertical de color para dibujar la aurora columna a columna (rápido).
  function crearTiras(c1, c2) {
    function hacer(invertida) {
      var c = document.createElement('canvas');
      c.width = 4; c.height = 256;
      var ctx = c.getContext('2d');
      var g = invertida ? ctx.createLinearGradient(0, 0, 0, 256) : ctx.createLinearGradient(0, 256, 0, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.14, c1);
      g.addColorStop(0.25, c1);
      g.addColorStop(0.6, c2);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 256);
      // atenuar la parte alta para que sea un velo
      var g2 = invertida ? ctx.createLinearGradient(0, 0, 0, 256) : ctx.createLinearGradient(0, 256, 0, 0);
      g2.addColorStop(0, 'rgba(0,0,0,0)');
      g2.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, 4, 256);
      return c;
    }
    tira = hacer(false);
    tiraReflejo = hacer(true);
    coloresTira = c1 + c2;
  }

  F.crearFondo({
    capas: ['fondo', 'aurora', 'frente', 'fx'],
    opaca: 'fondo',
    ajustes: { intensidad: 70, colorAurora: '#3dffa6', colorAurora2: '#a05cff', nieve: 30, fuerzaCursor: 60, fps: 30 },
    alRedimensionar: preparar,
    dibujarFondo: pintarFondo,
    estaticas: { frente: pintarFrente },
    dibujar: dibujar,
    alTocar: tocar,
    alCambiarAjuste: function (n) { if (n === 'nieve' || n === 'reducido') ajustarNieve(); }
  });

  function preparar(estado) {
    e = estado;
    var W = e.ancho, H = e.alto, u = e.u;
    lagoY = H * 0.7;
    lagoFin = H * 0.83;
    cabana.x = W * 0.72; cabana.y = H * 0.86;
    var paso = 8 * u;
    var columnas = Math.ceil(W / paso) + 4;
    cintas = [];
    for (var k = 0; k < 3; k++) {
      cintas.push({
        base: H * (0.3 + k * 0.07), alto: H * (0.3 - k * 0.05),
        f1: 0.0016 + k * 0.0005, f2: 0.0041 + k * 0.0009, f3: 0.009 + k * 0.003,
        s1: 0.11 + k * 0.04, s2: 0.07 + k * 0.03, s3: 0.25 + k * 0.08, fase: k * 2.1,
        amp: H * (0.06 - k * 0.012),
        desvio: new Float32Array(columnas), brillo: new Float32Array(columnas)
      });
    }
    titilantes = [];
    var rnd = F.semilla(51);
    for (var i = 0; i < 60; i++) titilantes.push({ x: rnd() * W, y: rnd() * H * 0.5, r: (0.8 + rnd() * 1.3) * u, fase: rnd() * TAU, vel: 0.6 + rnd() * 1.8 });
    ajustarNieve(true);
  }

  function ajustarNieve(reiniciar) {
    var W = e.ancho, H = e.alto, u = e.u;
    var objetivo = Math.round(220 * (F.limitar(Number(e.ajustes.nieve), 0, 100) / 50) * (e.reducido ? 0.35 : 1));
    if (reiniciar) nieve = [];
    while (nieve.length < objetivo) {
      var z = 0.35 + Math.pow(Math.random(), 2) * 0.65;
      nieve.push({ x: Math.random() * W, y: Math.random() * H, z: z, r: (0.8 + z * 2.2) * u, caida: (18 + z * 45) * u, fase: Math.random() * TAU, px: 0, py: 0 });
    }
    if (nieve.length > objetivo) nieve.length = objetivo;
  }

  // ---------- Paisaje ----------
  function pintarFondo(ctx, e) {
    var W = e.ancho, H = e.alto, u = e.u;
    var rnd = F.semilla(888);
    var cielo = ctx.createLinearGradient(0, 0, 0, lagoY);
    cielo.addColorStop(0, '#020812');
    cielo.addColorStop(0.5, '#06182c');
    cielo.addColorStop(1, '#0d2a40');
    ctx.fillStyle = cielo;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    for (var i = 0; i < 380; i++) {
      ctx.globalAlpha = 0.2 + rnd() * 0.7;
      var r = (0.4 + Math.pow(rnd(), 3) * 1.4) * u;
      ctx.beginPath(); ctx.arc(rnd() * W, rnd() * lagoY * 0.95, r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // agua del lago (debajo de la capa de aurora, que dibuja el reflejo)
    var lago = ctx.createLinearGradient(0, lagoY, 0, lagoFin);
    lago.addColorStop(0, '#0f2c44'); lago.addColorStop(1, '#06182a');
    ctx.fillStyle = lago;
    ctx.fillRect(0, lagoY, W, H - lagoY);
  }

  function cordillera(ctx, W, H, rnd, yBase, altoMin, altoMax, n, claro, oscuro, roca) {
    var anchoMedio = W / n;
    for (var i = -1; i <= n; i++) {
      var px = (i + 0.3 + rnd() * 0.4) * anchoMedio;
      var py = yBase - (altoMin + rnd() * (altoMax - altoMin));
      var semi = anchoMedio * (0.8 + rnd() * 0.6);
      // cara en sombra
      ctx.fillStyle = roca;
      ctx.beginPath();
      ctx.moveTo(px - semi, yBase); ctx.lineTo(px, py); ctx.lineTo(px + semi, yBase); ctx.closePath();
      ctx.fill();
      // nieve: cara iluminada (izquierda) y cara oscura (derecha)
      var gN = ctx.createLinearGradient(0, py, 0, yBase);
      gN.addColorStop(0, claro); gN.addColorStop(1, 'rgba(120,150,190,0.15)');
      ctx.fillStyle = gN;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - semi, yBase);
      ctx.lineTo(px - semi * 0.15, yBase);
      for (var z = 0; z < 4; z++) ctx.lineTo(px - semi * (0.05 + z * 0.06), py + (yBase - py) * (0.85 - z * 0.18));
      ctx.closePath();
      ctx.fill();
      var gS = ctx.createLinearGradient(0, py, 0, yBase);
      gS.addColorStop(0, oscuro); gS.addColorStop(1, 'rgba(60,80,120,0.1)');
      ctx.fillStyle = gS;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + semi * 0.55, py + (yBase - py) * 0.55);
      ctx.lineTo(px + semi * 0.2, py + (yBase - py) * 0.6);
      ctx.lineTo(px + semi * 0.3, py + (yBase - py) * 0.8);
      ctx.lineTo(px - semi * 0.05, py + (yBase - py) * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  function pino(ctx, x, y, h, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var yy = y - h * (0.2 + i * 0.2), w = h * (0.3 - i * 0.06);
      ctx.moveTo(x, yy - h * 0.3);
      ctx.lineTo(x + w, yy + h * 0.06);
      ctx.lineTo(x - w, yy + h * 0.06);
    }
    ctx.fill();
    ctx.fillRect(x - h * 0.03, y - h * 0.2, h * 0.06, h * 0.2);
  }

  function pintarFrente(ctx, e) {
    var W = e.ancho, H = e.alto, u = e.u;
    var rnd = F.semilla(313);
    cordillera(ctx, W, H, rnd, lagoY, H * 0.12, H * 0.22, 4, 'rgba(150,175,210,0.55)', 'rgba(40,60,95,0.6)', '#1a2c45');
    cordillera(ctx, W, H, rnd, lagoY, H * 0.06, H * 0.14, 6, 'rgba(215,230,248,0.95)', 'rgba(70,95,135,0.9)', '#22385a');
    // velo frío sobre el agua y destellos del hielo
    ctx.fillStyle = 'rgba(10,30,50,0.25)';
    ctx.fillRect(0, lagoY, W, lagoFin - lagoY);
    ctx.fillStyle = 'rgba(200,230,255,0.12)';
    for (var g = 0; g < 40; g++) {
      var gy = lagoY + Math.pow(rnd(), 1.5) * (lagoFin - lagoY);
      ctx.fillRect(rnd() * W, gy, (30 + rnd() * 120) * u, 1.2 * u);
    }
    // orilla nevada con bosque
    var orilla = ctx.createLinearGradient(0, lagoFin - 10 * u, 0, H);
    orilla.addColorStop(0, '#c9d9ee'); orilla.addColorStop(1, '#7f97bb');
    ctx.fillStyle = orilla;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W + 20; x += 20) ctx.lineTo(x, lagoFin + Math.sin(x * 0.004) * 10 * u + Math.sin(x * 0.013) * 5 * u);
    ctx.lineTo(W, H);
    ctx.fill();
    for (var p = 0; p < 70; p++) {
      var xp = rnd() * W;
      if (Math.abs(xp - cabana.x) < 70 * u) continue;
      var hp = (40 + rnd() * 70) * u;
      pino(ctx, xp, lagoFin + 8 * u + rnd() * 10 * u, hp, rnd() < 0.5 ? '#0b1a2b' : '#10243a');
    }
    // cabaña
    var cx = cabana.x, cy = cabana.y, cw = 90 * u, ch = 52 * u;
    ctx.fillStyle = '#2b1f22';
    ctx.fillRect(cx - cw / 2, cy - ch, cw, ch);
    ctx.fillRect(cx + cw * 0.2, cy - ch - 44 * u, 12 * u, 30 * u);
    ctx.fillStyle = '#e8f0fb';
    ctx.beginPath();
    ctx.moveTo(cx - cw * 0.65, cy - ch + 4 * u); ctx.lineTo(cx, cy - ch - 40 * u); ctx.lineTo(cx + cw * 0.65, cy - ch + 4 * u);
    ctx.closePath(); ctx.fill();
    var vg = ctx.createRadialGradient(cx - cw * 0.18, cy - ch * 0.5, 0, cx - cw * 0.18, cy - ch * 0.5, 70 * u);
    vg.addColorStop(0, 'rgba(255,190,100,0.45)'); vg.addColorStop(1, 'rgba(255,190,100,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(cx - cw * 0.18 - 70 * u, cy - ch * 0.5 - 70 * u, 140 * u, 140 * u);
    ctx.fillStyle = '#ffc56b';
    ctx.fillRect(cx - cw * 0.3, cy - ch * 0.68, cw * 0.22, ch * 0.36);
    ctx.fillRect(cx + cw * 0.08, cy - ch * 0.68, cw * 0.16, ch * 0.36);
    // nieve delante
    var delante = ctx.createLinearGradient(0, H * 0.9, 0, H);
    delante.addColorStop(0, '#e9f1fc'); delante.addColorStop(1, '#b4c7e3');
    ctx.fillStyle = delante;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H * 0.93);
    ctx.bezierCurveTo(W * 0.3, H * 0.89, W * 0.6, H * 0.95, W, H * 0.91);
    ctx.lineTo(W, H);
    ctx.fill();
  }

  // ---------- Interacción ----------
  function tocar(x, y, e) {
    var u = e.u;
    if (y < lagoY - e.alto * 0.08) {
      lanzarFugaz(x, y);
    } else {
      destellos.push({ x: x, vida: 1 });
    }
  }

  function lanzarFugaz(x, y) {
    var u = e.u, ang = Math.PI * (0.78 + Math.random() * 0.12);
    var vel = (900 + Math.random() * 500) * u;
    if (x < e.ancho * 0.3) ang = Math.PI - ang; // si está a la izquierda, que vaya a la derecha
    fugaces.push({ x: x, y: y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, vida: 1 });
  }

  // ---------- Animación ----------
  function dibujar(e, dt) {
    var W = e.ancho, H = e.alto, u = e.u, t = e.t, p = e.puntero;
    var lento = e.reducido ? 0.3 : 1;
    var ctx = e.capas.aurora.ctx;
    ctx.clearRect(0, 0, W, H);

    if (coloresTira !== String(e.ajustes.colorAurora) + String(e.ajustes.colorAurora2)) {
      crearTiras(String(e.ajustes.colorAurora), String(e.ajustes.colorAurora2));
    }

    // estrellas que titilan
    ctx.fillStyle = '#fff';
    for (var s = 0; s < titilantes.length; s++) {
      var st = titilantes[s];
      ctx.globalAlpha = e.reducido ? 0.6 : 0.3 + 0.7 * Math.abs(Math.sin(t * st.vel + st.fase));
      ctx.fillRect(st.x - st.r / 2, st.y - st.r / 2, st.r, st.r);
    }

    // aurora
    var intensidad = F.limitar(Number(e.ajustes.intensidad), 0, 100) / 100;
    var paso = 8 * u;
    var esc = e.escala;
    var tt = t * lento;
    var suav = Math.min(1, dt * 2.5);
    var radioP = 260 * u;
    for (var dd = destellos.length - 1; dd >= 0; dd--) {
      destellos[dd].vida -= dt * 0.6;
      if (destellos[dd].vida <= 0) destellos.splice(dd, 1);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (var k = 0; k < cintas.length; k++) {
      var c = cintas[k];
      var i = 0;
      for (var x = -paso; x < W + paso; x += paso, i++) {
        var yb = c.base + c.amp * Math.sin(x * c.f1 + tt * c.s1 + c.fase) + c.amp * 0.5 * Math.sin(x * c.f2 - tt * c.s2 + c.fase * 2);
        // el ratón atrae la cinta y la ilumina
        var objetivoDesvio = 0, objetivoBrillo = 0;
        if (p.activo) {
          var g = Math.exp(-((x - p.x) * (x - p.x)) / (2 * radioP * radioP));
          var py = Math.min(p.y, lagoY - H * 0.1);
          objetivoDesvio = (py - yb) * 0.35 * g;
          objetivoBrillo = 0.7 * g;
        }
        for (var q = 0; q < destellos.length; q++) {
          var dg = Math.exp(-((x - destellos[q].x) * (x - destellos[q].x)) / (2 * radioP * radioP * 2));
          objetivoBrillo += destellos[q].vida * 1.2 * dg;
        }
        c.desvio[i] += (objetivoDesvio - c.desvio[i]) * suav;
        c.brillo[i] += (objetivoBrillo - c.brillo[i]) * suav;
        yb += c.desvio[i];
        var pliegue = 0.5 + 0.5 * Math.sin(x * c.f3 + tt * c.s3 + Math.sin(x * 0.0023 + tt * 0.2) * 3);
        var alfa = intensidad * (0.12 + 0.55 * pliegue * pliegue) * (1 + c.brillo[i]);
        if (alfa < 0.01) continue;
        var h = c.alto * (0.6 + 0.4 * Math.sin(x * 0.003 + tt * 0.15 + k));
        // columnas ajustadas a píxeles exactos: sin huecos ni solapes (evita rayas)
        var x0 = Math.round(x * esc) / esc, x1 = Math.round((x + paso) * esc) / esc;
        ctx.globalAlpha = Math.min(1, alfa);
        ctx.drawImage(tira, x0, yb - h, x1 - x0, h);
        // reflejo en el lago (más tenue y aplastado)
        var dist = lagoY - yb;
        if (dist > 0) {
          ctx.globalAlpha = Math.min(1, alfa * 0.35);
          ctx.drawImage(tiraReflejo, x0, lagoY + dist * 0.18, x1 - x0, h * 0.3);
        }
      }
    }
    ctx.globalAlpha = 1;

    // estrellas fugaces (también aparecen solas de vez en cuando)
    proximaFugaz -= dt;
    if (proximaFugaz <= 0 && !e.reducido) {
      proximaFugaz = 18 + Math.random() * 30;
      lanzarFugaz(W * (0.2 + Math.random() * 0.7), H * (0.05 + Math.random() * 0.2));
    }
    ctx.lineCap = 'round';
    for (var f = fugaces.length - 1; f >= 0; f--) {
      var fu = fugaces[f];
      fu.vida -= dt * 1.1;
      if (fu.vida <= 0) { fugaces.splice(f, 1); continue; }
      fu.x += fu.vx * dt; fu.y += fu.vy * dt;
      var cola = 0.12;
      var grad = ctx.createLinearGradient(fu.x, fu.y, fu.x - fu.vx * cola, fu.y - fu.vy * cola);
      grad.addColorStop(0, 'rgba(255,255,255,' + fu.vida.toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(160,220,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.4 * u;
      ctx.beginPath(); ctx.moveTo(fu.x, fu.y); ctx.lineTo(fu.x - fu.vx * cola, fu.y - fu.vy * cola); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    // --- capa superior: humo de la chimenea y nieve ---
    ctx = e.capas.fx.ctx;
    ctx.clearRect(0, 0, W, H);
    if (Math.random() < dt * 2.5) {
      humo.push({ x: cabana.x + 90 * u * 0.2 + 6 * u, y: cabana.y - 52 * u - 44 * u, r: 6 * u, vida: 1 });
    }
    ctx.fillStyle = '#c9d6e8';
    for (var hh = humo.length - 1; hh >= 0; hh--) {
      var hu = humo[hh];
      hu.vida -= dt * 0.18;
      if (hu.vida <= 0) { humo.splice(hh, 1); continue; }
      hu.y -= 16 * u * dt * lento; hu.x += (6 + Math.sin(t + hh) * 4) * u * dt * lento; hu.r += 5 * u * dt;
      ctx.globalAlpha = hu.vida * 0.1;
      ctx.beginPath(); ctx.arc(hu.x, hu.y, hu.r, 0, TAU); ctx.fill();
    }

    var fuerza = F.limitar(Number(e.ajustes.fuerzaCursor), 0, 100) / 60;
    var R = 130 * u, R2 = R * R, amort = Math.pow(0.12, dt);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    for (var n = 0; n < nieve.length; n++) {
      var cp = nieve[n];
      cp.fase += dt * (0.4 + cp.z);
      if (p.activo && fuerza > 0) {
        var dx = cp.x - p.x, dy = cp.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          var d = Math.sqrt(d2) || 1, kk = 1 - d / R;
          var emp = kk * kk * 2200 * u * fuerza * dt;
          cp.px += (dx / d) * emp + p.vx * kk * 2 * dt;
          cp.py += (dy / d) * emp + p.vy * kk * 2 * dt;
        }
      }
      cp.px *= amort; cp.py *= amort;
      cp.x += (Math.sin(cp.fase) * 10 * u * cp.z) * dt * lento + cp.px * dt;
      cp.y += cp.caida * dt * lento + cp.py * dt;
      if (cp.y > H + 6 * u) { cp.y = -6 * u; cp.x = Math.random() * W; }
      else if (cp.y < -40 * u) cp.y = H;
      if (cp.x < -10 * u) cp.x += W + 20 * u; else if (cp.x > W + 10 * u) cp.x -= W + 20 * u;
      ctx.moveTo(cp.x + cp.r, cp.y);
      ctx.arc(cp.x, cp.y, cp.r, 0, TAU);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
})();
