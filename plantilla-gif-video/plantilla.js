/*
 * plantilla.js · Fondos Dinámicos (MIT)
 * Pone tu imagen, GIF o vídeo de fondo y un efecto interactivo encima.
 *
 * Busca, en este orden, un archivo llamado:
 *   mi-fondo.mp4, mi-fondo.webm, mi-fondo.m4v, mi-fondo.gif, mi-fondo.webp, mi-fondo.jpg, mi-fondo.jpeg, mi-fondo.png
 * (o el que diga AJUSTES.archivo en ajustes.js). Basta con dejar tu archivo con ese nombre en esta carpeta.
 */
(function () {
  'use strict';
  var F = window.FondosDinamicos;

  var VIDEOS = ['mp4', 'webm', 'm4v'];
  var IMAGENES = ['gif', 'webp', 'jpg', 'jpeg', 'png'];
  var AJUSTES_FIT = ['cubrir', 'ajustar', 'estirar'];
  var CSS_FIT = { cubrir: 'cover', ajustar: 'contain', estirar: 'fill' };

  var contenedor = document.getElementById('medio');
  var velo = document.getElementById('velo');
  var aviso = document.getElementById('aviso');
  var medio = null, esVideo = false;
  var efectos = null;

  var e = F.crearFondo({
    capas: ['fx'],
    ajustes: {
      archivo: '', efecto: 'nieve', cantidad: 50, tamano: 100, velocidad: 100,
      fuerzaCursor: 60, oscurecer: 0, ajuste: 'cubrir', fps: 30
    },
    alRedimensionar: function (est) {
      if (!efectos) {
        efectos = window.Efectos.crear(est);
        efectos.poner(est.ajustes.efecto);
      } else {
        reiniciarEfecto();
      }
    },
    dibujar: function (est, dt) {
      var ctx = est.capas.fx.ctx;
      ctx.clearRect(0, 0, est.ancho, est.alto);
      efectos.paso(ctx, dt);
    },
    alTocar: function (x, y) { efectos.tocar(x, y); },
    alCambiarAjuste: function (nombre, valor) {
      if (nombre === 'efecto') efectos.poner(valor);
      else if (nombre === 'cantidad' || nombre === 'reducido') efectos.ajustar(false);
      else if (nombre === 'tamano') reiniciarEfecto();
      else if (nombre === 'oscurecer' || nombre === 'ajuste') aplicarEstilo();
    },
    alPausar: function (pausado) {
      if (!esVideo || !medio) return;
      if (pausado) medio.pause();
      else { var p = medio.play(); if (p && p.catch) p.catch(function () {}); }
    },
    capturarDebajo: function (ctx, w, h) {
      if (!medio) return;
      var mw = medio.videoWidth || medio.naturalWidth, mh = medio.videoHeight || medio.naturalHeight;
      if (!mw || !mh) return;
      var s = Math.max(w / mw, h / mh);
      try { ctx.drawImage(medio, (w - mw * s) / 2, (h - mh * s) / 2, mw * s, mh * s); } catch (err) { /* sin acceso al fotograma */ }
      var oscuro = F.limitar(Number(e.ajustes.oscurecer) || 0, 0, 90) / 100;
      if (oscuro) { ctx.fillStyle = 'rgba(0,0,0,' + oscuro + ')'; ctx.fillRect(0, 0, w, h); }
    }
  });

  function reiniciarEfecto() {
    var actual = efectos.tipo;
    efectos.poner('ninguno');
    efectos.poner(actual);
  }

  function aplicarEstilo() {
    var a = e.ajustes.ajuste;
    var nombre = typeof a === 'number' ? AJUSTES_FIT[a] : String(a || 'cubrir').toLowerCase();
    var fit = CSS_FIT[nombre] || 'cover';
    if (medio) medio.style.objectFit = fit;
    velo.style.opacity = String(F.limitar(Number(e.ajustes.oscurecer) || 0, 0, 90) / 100);
  }

  // ---------- Cargar el archivo de fondo ----------
  function candidatos() {
    var fijo = String(e.ajustes.archivo || '').trim();
    if (fijo) return [fijo];
    return VIDEOS.concat(IMAGENES).map(function (ext) { return 'mi-fondo.' + ext; });
  }

  function extension(nombre) {
    var m = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(nombre);
    return m ? m[1].toLowerCase() : '';
  }

  function probar(lista, i) {
    if (i >= lista.length) { mostrarAviso(); return; }
    var nombre = lista[i];
    var video = VIDEOS.indexOf(extension(nombre)) >= 0;
    var el = document.createElement(video ? 'video' : 'img');
    var listo = false;
    function bien() {
      if (listo) return; listo = true;
      medio = el; esVideo = video;
      contenedor.appendChild(el);
      aplicarEstilo();
      if (video) { var p = el.play(); if (p && p.catch) p.catch(function () {}); }
    }
    function mal() {
      if (listo) return; listo = true;
      el.removeAttribute('src');
      probar(lista, i + 1);
    }
    el.addEventListener('error', mal);
    if (video) {
      el.muted = true; el.defaultMuted = true;
      el.loop = true; el.autoplay = true; el.playsInline = true;
      el.setAttribute('muted', ''); el.setAttribute('playsinline', '');
      el.preload = 'auto';
      el.addEventListener('loadeddata', bien);
    } else {
      el.alt = '';
      el.decoding = 'async';
      el.addEventListener('load', bien);
    }
    el.src = nombre;
  }

  function mostrarAviso() {
    aviso.hidden = false;
  }

  probar(candidatos(), 0);
})();
