/*!
 * motor.js · Fondos Dinámicos — base común de todos los fondos (licencia MIT)
 *
 * Qué hace por cada fondo:
 *   - Crea los lienzos (canvas) y los ajusta a la pantalla, también en 4K, con un tope de píxeles.
 *   - Limita los FPS (30 por defecto) para gastar poca batería.
 *   - Se pausa cuando la pestaña está oculta o cuando Lively avisa que el fondo está en pausa.
 *   - Respeta "reducir movimiento" (prefers-reduced-motion) del sistema.
 *   - Sigue el ratón (posición y velocidad) y avisa de los clics.
 *   - Lee ajustes de tres sitios, en este orden: valores del fondo, window.AJUSTES
 *     (archivo ajustes.js, si existe), la dirección (?nieve=80&fps=60) y el menú de Lively.
 *
 * No depende de Lively: dentro de Lively usa sus funciones opcionales; en un navegador
 * o en otro motor simplemente no se llaman y el fondo funciona igual.
 *
 * Este archivo se copia en cada fondo con herramientas/empaquetar.py. Edita solo comun/motor.js.
 */
(function (global) {
  'use strict';

  // Tope de píxeles por lienzo: una pantalla 4K completa. Evita gastar de más en pantallas enormes.
  var PRESUPUESTO_PIXELES = 3840 * 2160;

  function azar(a, b) { return a + Math.random() * (b - a); }
  function limitar(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mezclar(a, b, t) { return a + (b - a) * t; }

  // Generador de números aleatorios con semilla: el paisaje sale igual cada vez que se redibuja.
  function semilla(s) {
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Dibuja algo una vez en un lienzo pequeño para reutilizarlo (mucho más rápido que redibujarlo).
  function sprite(tam, dibujar) {
    var c = document.createElement('canvas');
    c.width = c.height = Math.ceil(tam);
    dibujar(c.getContext('2d'), tam);
    return c;
  }

  // Un brillo redondo y suave del color indicado (para luces, soles, luciérnagas...).
  function brillo(color, tam) {
    tam = tam || 64;
    return sprite(tam, function (ctx, t) {
      var g = ctx.createRadialGradient(t / 2, t / 2, 0, t / 2, t / 2, t / 2);
      g.addColorStop(0, color);
      g.addColorStop(0.25, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(t / 2, t / 2, t / 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function asignar(destino, origen) {
    if (!origen || typeof origen !== 'object') return destino;
    for (var k in origen) if (Object.prototype.hasOwnProperty.call(origen, k)) destino[k] = origen[k];
    return destino;
  }

  function leerURL() {
    var r = {};
    try {
      new URLSearchParams(global.location.search).forEach(function (v, k) {
        if (v === 'true' || v === 'false') r[k] = v === 'true';
        else if (v !== '' && !isNaN(v)) r[k] = Number(v);
        else r[k] = v;
      });
    } catch (e) { /* sin parámetros */ }
    return r;
  }

  var instancia = null;

  /**
   * crearFondo({
   *   capas: ['fondo', 'fx'],     // lienzos de abajo arriba
   *   opaca: 'fondo',             // capa sin transparencia (más rápida); omitir si debajo hay vídeo
   *   ajustes: { ... },           // valores por defecto
   *   alRedimensionar(e), dibujarFondo(ctx, e), dibujar(e, dt), alTocar(x, y, e), alCambiarAjuste(nombre, valor, e),
   *   estaticas: { frente: function (ctx, e) {...} }  // capas fijas extra, se pintan solo al cambiar el tamaño
   * })
   * "e" es el estado: { ancho, alto, u, escala, t, reducido, ajustes, puntero, capas, redibujarFondo() }
   *   u = tamaño relativo a una pantalla 1920×1080 (1 en Full HD, 2 en 4K sin escalado).
   */
  function crearFondo(op) {
    op = op || {};
    var ajustes = { fps: 30, calidad: 1 };
    asignar(ajustes, op.ajustes);
    asignar(ajustes, global.AJUSTES);
    asignar(ajustes, leerURL());

    var nombresCapas = op.capas || ['fx'];
    var capas = {};
    nombresCapas.forEach(function (nombre, i) {
      var c = document.createElement('canvas');
      c.className = 'capa capa-' + nombre;
      c.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;display:block;z-index:' + (i + 1);
      document.body.appendChild(c);
      var ctx = c.getContext('2d', nombre === op.opaca ? { alpha: false } : undefined);
      capas[nombre] = { canvas: c, ctx: ctx };
    });

    var consultaMovimiento = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;

    var e = {
      ancho: 0, alto: 0, u: 1, escala: 1, t: 0,
      reducido: !!(consultaMovimiento && consultaMovimiento.matches),
      ajustes: ajustes,
      capas: capas,
      puntero: { x: -9999, y: -9999, vx: 0, vy: 0, activo: false, ultimo: 0 },
      redibujarFondo: function () { fondoSucio = true; if (!corriendo) pintar(0); }
    };

    var fondoSucio = true, corriendo = false, rafId = 0, ultimo = 0, pausaLively = false;

    function redimensionar() {
      var w = global.innerWidth || document.documentElement.clientWidth || 1920;
      var h = global.innerHeight || document.documentElement.clientHeight || 1080;
      var esc = Math.min(global.devicePixelRatio || 1, 2) * limitar(Number(ajustes.calidad) || 1, 0.25, 1);
      if (w * h * esc * esc > PRESUPUESTO_PIXELES) esc = Math.sqrt(PRESUPUESTO_PIXELES / (w * h));
      e.ancho = w; e.alto = h; e.escala = esc;
      e.u = Math.sqrt((w * h) / (1920 * 1080));
      for (var k in capas) {
        var c = capas[k].canvas;
        c.width = Math.max(1, Math.round(w * esc));
        c.height = Math.max(1, Math.round(h * esc));
        capas[k].ctx.setTransform(esc, 0, 0, esc, 0, 0);
      }
      if (op.alRedimensionar) op.alRedimensionar(e);
      fondoSucio = true;
      if (!corriendo) pintar(0);
    }

    function pintar(dt) {
      e.t += dt;
      var p = e.puntero;
      // La velocidad del ratón se apaga sola si deja de moverse.
      var amort = Math.pow(0.001, dt);
      p.vx *= amort; p.vy *= amort;
      if (p.activo && performance.now() - p.ultimo > 5000) p.activo = false;
      if (fondoSucio) {
        fondoSucio = false;
        if (op.dibujarFondo && capas[nombresCapas[0]]) op.dibujarFondo(capas[nombresCapas[0]].ctx, e);
        // Otras capas fijas (por ejemplo, un primer plano por delante del agua animada).
        if (op.estaticas) {
          for (var nombre in op.estaticas) {
            if (!capas[nombre]) continue;
            capas[nombre].ctx.clearRect(0, 0, e.ancho, e.alto);
            op.estaticas[nombre](capas[nombre].ctx, e);
          }
        }
      }
      if (op.dibujar) op.dibujar(e, dt);
    }

    function cuadro(ahora) {
      rafId = global.requestAnimationFrame(cuadro);
      var fps = limitar(Number(ajustes.fps) || 30, 5, 240);
      if (e.reducido) fps = Math.min(fps, 20);
      var intervalo = 1000 / fps;
      if (ultimo && ahora - ultimo < intervalo * 0.9) return;
      var dt = ultimo ? Math.min((ahora - ultimo) / 1000, 0.1) : 1 / fps;
      ultimo = ahora;
      pintar(dt);
    }

    function actualizarMarcha() {
      var debeCorrer = !document.hidden && !pausaLively;
      if (debeCorrer && !corriendo) {
        corriendo = true; ultimo = 0;
        rafId = global.requestAnimationFrame(cuadro);
      } else if (!debeCorrer && corriendo) {
        corriendo = false;
        global.cancelAnimationFrame(rafId);
      }
    }

    // --- Ratón / táctil ---
    function mover(ev) {
      var p = e.puntero, ahora = performance.now();
      var x = ev.clientX, y = ev.clientY;
      if (p.activo) {
        var dtp = Math.max(ahora - p.ultimo, 8) / 1000;
        p.vx = mezclar(p.vx, (x - p.x) / dtp, 0.5);
        p.vy = mezclar(p.vy, (y - p.y) / dtp, 0.5);
      }
      p.x = x; p.y = y; p.activo = true; p.ultimo = ahora;
    }
    var ultimoPointer = -1e9;
    function tocar(ev) {
      if (ev.button !== undefined && ev.button !== 0) return;
      var ahora = performance.now();
      // El navegador envía pointerdown y después mousedown por el mismo clic: usamos solo uno.
      if (ev.type === 'pointerdown') ultimoPointer = ahora;
      else if (ahora - ultimoPointer < 600) return;
      mover(ev);
      if (op.alTocar) op.alTocar(ev.clientX, ev.clientY, e);
    }
    function salir() { e.puntero.activo = false; }

    global.addEventListener('pointermove', mover, { passive: true });
    global.addEventListener('mousemove', mover, { passive: true });
    global.addEventListener('pointerdown', tocar, { passive: true });
    global.addEventListener('mousedown', tocar, { passive: true });
    document.addEventListener('mouseleave', salir);
    global.addEventListener('blur', function () { e.puntero.vx = e.puntero.vy = 0; });

    var esperaResize = 0;
    global.addEventListener('resize', function () {
      clearTimeout(esperaResize);
      esperaResize = setTimeout(redimensionar, 120);
    });
    document.addEventListener('visibilitychange', actualizarMarcha);
    if (consultaMovimiento) {
      var alCambiarMov = function () {
        e.reducido = consultaMovimiento.matches;
        if (op.alCambiarAjuste) op.alCambiarAjuste('reducido', e.reducido, e);
      };
      if (consultaMovimiento.addEventListener) consultaMovimiento.addEventListener('change', alCambiarMov);
      else if (consultaMovimiento.addListener) consultaMovimiento.addListener(alCambiarMov);
    }

    // --- Lively Wallpaper (opcional: si no estamos en Lively, nadie llama a esto) ---
    // Menú de ajustes de Lively (LivelyProperties.json). Se llama al cargar y en cada cambio.
    global.livelyPropertyListener = function (nombre, valor) {
      ajustes[nombre] = valor;
      if (nombre === 'calidad') redimensionar();
      if (op.alCambiarAjuste) op.alCambiarAjuste(nombre, valor, e);
      e.redibujarFondo();
    };
    // Aviso de pausa de Lively (requiere "--pause-event true" en LivelyInfo.json).
    global.livelyWallpaperPlaybackChanged = function (datos) {
      try {
        var obj = typeof datos === 'string' ? JSON.parse(datos) : datos;
        pausaLively = !!(obj && obj.IsPaused);
      } catch (err) { pausaLively = false; }
      actualizarMarcha();
    };

    redimensionar();
    actualizarMarcha();

    // Captura una imagen del fondo (para miniaturas). Devuelve un data URL JPEG.
    e.capturar = function (anchoSalida) {
      anchoSalida = anchoSalida || 640;
      var altoSalida = Math.round(anchoSalida * e.alto / e.ancho);
      var c = document.createElement('canvas');
      c.width = anchoSalida; c.height = altoSalida;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, anchoSalida, altoSalida);
      if (op.capturarDebajo) op.capturarDebajo(ctx, anchoSalida, altoSalida);
      nombresCapas.forEach(function (n) { ctx.drawImage(capas[n].canvas, 0, 0, anchoSalida, altoSalida); });
      return c.toDataURL('image/jpeg', 0.88);
    };

    // Avanza la animación a mano (pruebas y miniaturas, aunque la ventana esté oculta).
    e.avanzar = function (segundos, fps) {
      fps = fps || 30;
      var pasos = Math.max(1, Math.round((segundos || 0) * fps));
      for (var i = 0; i < pasos; i++) pintar(1 / fps);
    };

    instancia = e;
    return e;
  }

  global.FondosDinamicos = {
    crearFondo: crearFondo,
    azar: azar,
    limitar: limitar,
    mezclar: mezclar,
    semilla: semilla,
    sprite: sprite,
    brillo: brillo,
    get actual() { return instancia; }
  };
})(window);
