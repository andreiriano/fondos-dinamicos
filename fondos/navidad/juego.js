/*
 * juego.js · Navidad · Fondos Dinámicos (MIT)
 * Progreso del juego: luces del día, racha, copos dorados, calendario de adviento y logros.
 * Se guarda en localStorage (si el navegador no deja, el juego funciona igual pero no recuerda nada).
 * La fecha se puede simular para probar: index.html?fecha=2026-12-05
 */
(function (global) {
  'use strict';

  var CLAVE = 'fondos-dinamicos.navidad.v1';
  var EN = /^en/i.test((global.navigator && navigator.language) || '');

  function t(par) { return typeof par === 'string' ? par : (EN ? par.en : par.es); }

  // ---------- Fecha (con opción de simularla) ----------
  function fechaSimulada() {
    try {
      var m = /[?&]fecha=(\d{4})-(\d{2})-(\d{2})/.exec(global.location.search);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
    } catch (e) { /* nada */ }
    return null;
  }
  var simulada = fechaSimulada();
  function hoy() { return simulada ? new Date(simulada.getTime()) : new Date(); }
  function claveDia(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function ayer(d) { var a = new Date(d.getTime()); a.setDate(a.getDate() - 1); return a; }

  // ---------- Guardado ----------
  function leer() {
    try { return JSON.parse(global.localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; }
  }
  function guardar() {
    try { global.localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { /* sin guardado */ }
  }
  function nuevo() {
    return {
      version: 1,
      luces: { dia: null, encendidas: [] },
      racha: { ultimo: null, dias: 0, mejor: 0 },
      copos: 0,
      adviento: { temporada: null, abiertos: [] },
      logros: {}
    };
  }
  var estado = (function () {
    var e = leer(), base = nuevo();
    for (var k in base) if (!(k in e)) e[k] = base[k];
    return e;
  })();

  // ---------- Luces del día ----------
  function lucesDeHoy() {
    var d = claveDia(hoy());
    if (estado.luces.dia !== d) { estado.luces = { dia: d, encendidas: [] }; guardar(); }
    return estado.luces.encendidas;
  }
  function encender(i) {
    var lista = lucesDeHoy();
    if (lista.indexOf(i) >= 0) return false;
    lista.push(i);
    guardar();
    return true;
  }
  /** Llamar cuando están todas encendidas. Devuelve los logros nuevos. */
  function arbolCompleto() {
    var d = hoy(), clave = claveDia(d), nuevos = [];
    if (estado.racha.ultimo !== clave) {
      estado.racha.dias = estado.racha.ultimo === claveDia(ayer(d)) ? estado.racha.dias + 1 : 1;
      estado.racha.ultimo = clave;
      estado.racha.mejor = Math.max(estado.racha.mejor, estado.racha.dias);
    }
    if (logro('primerArbol')) nuevos.push('primerArbol');
    if (estado.racha.dias >= 3 && logro('racha3')) nuevos.push('racha3');
    if (estado.racha.dias >= 7 && logro('racha7')) nuevos.push('racha7');
    guardar();
    return nuevos;
  }
  function rachaActual() {
    var d = hoy();
    var vale = estado.racha.ultimo === claveDia(d) || estado.racha.ultimo === claveDia(ayer(d));
    return vale ? estado.racha.dias : 0;
  }

  // ---------- Copos dorados y desbloqueos ----------
  var DESBLOQUEOS = [
    { copos: 3, id: 'trineo', texto: { es: 'el trineo de Papá Noel cruzando la luna', en: "Santa's sleigh crossing the moon" } },
    { copos: 6, id: 'muneco', texto: { es: 'un muñeco de nieve', en: 'a snowman' } },
    { copos: 10, id: 'guirnalda', texto: { es: 'una guirnalda de luces arriba', en: 'a string of lights at the top' } },
    { copos: 16, id: 'estrellasDoradas', texto: { es: 'estrellas fugaces doradas', en: 'golden shooting stars' } }
  ];
  function sumarCopo() {
    estado.copos++;
    var res = { total: estado.copos, desbloqueo: null, logros: [] };
    DESBLOQUEOS.forEach(function (d) { if (d.copos === estado.copos) res.desbloqueo = d; });
    if (estado.copos === 1 && logro('primerCopo')) res.logros.push('primerCopo');
    if (estado.copos >= 10 && logro('copos10')) res.logros.push('copos10');
    guardar();
    return res;
  }
  function desbloqueado(id) {
    for (var i = 0; i < DESBLOQUEOS.length; i++) if (DESBLOQUEOS[i].id === id) return estado.copos >= DESBLOQUEOS[i].copos;
    return false;
  }
  function siguienteDesbloqueo() {
    for (var i = 0; i < DESBLOQUEOS.length; i++) if (estado.copos < DESBLOQUEOS[i].copos) return DESBLOQUEOS[i];
    return null;
  }

  // ---------- Calendario de adviento ----------
  var SORPRESAS = [
    null,
    { tipo: 'adorno', texto: { es: 'Un adorno nuevo para tu árbol.', en: 'A new ornament for your tree.' } },
    { tipo: 'frase', texto: { es: 'Que no falte algo caliente en la taza y alguien con quien compartirlo.', en: 'May your mug stay warm and your company warmer.' } },
    { tipo: 'anim', anim: 'estrellas', texto: { es: '¡Lluvia de estrellas fugaces!', en: 'A shower of shooting stars!' } },
    { tipo: 'adorno', texto: { es: 'Otro adorno brilla en el árbol.', en: 'Another ornament shines on the tree.' } },
    { tipo: 'frase', texto: { es: 'Hoy, un mensaje a alguien a quien hace tiempo no saludas.', en: "Today, message someone you haven't talked to in a while." } },
    { tipo: 'anim', anim: 'nieveDorada', texto: { es: '¡Caen copos dorados! Atrápalos.', en: 'Golden snowflakes are falling! Catch them.' } },
    { tipo: 'adorno', texto: { es: 'Un adorno más para la colección.', en: 'One more ornament for the collection.' } },
    { tipo: 'prompt', texto: { es: 'El prompt del día para crear tu propio fondo con IA está en xuiatek.com/fondos', en: "Today's prompt to make your own AI wallpaper is on xuiatek.com/fondos" } },
    { tipo: 'frase', texto: { es: 'Respira hondo: diciembre también es para descansar.', en: 'Take a deep breath: December is for resting too.' } },
    { tipo: 'anim', anim: 'aurora', texto: { es: 'Una aurora boreal sobre la aldea.', en: 'Northern lights over the village.' } },
    { tipo: 'adorno', texto: { es: 'El árbol estrena adorno.', en: 'The tree gets a new ornament.' } },
    { tipo: 'frase', texto: { es: 'Escribe tres cosas buenas que te dejó este año.', en: 'Write down three good things this year gave you.' } },
    { tipo: 'anim', anim: 'trineo', texto: { es: 'Papá Noel ha pasado a saludar.', en: 'Santa just flew by to say hi.' } },
    { tipo: 'adorno', texto: { es: 'Un adorno nuevo cuelga del árbol.', en: 'A new ornament hangs on the tree.' } },
    { tipo: 'anim', anim: 'fuegos', texto: { es: '¡Fuegos artificiales!', en: 'Fireworks!' } },
    { tipo: 'frase', texto: { es: 'Pon tu canción navideña favorita, aunque sea bajito.', en: 'Play your favourite holiday song, even quietly.' } },
    { tipo: 'adorno', texto: { es: 'Otro adorno para tu árbol.', en: 'Another ornament for your tree.' } },
    { tipo: 'anim', anim: 'arcoiris', texto: { es: 'Nuevo juego de luces: arcoíris.', en: 'New light pattern: rainbow.' } },
    { tipo: 'frase', texto: { es: 'Un paseo corto, aunque haga frío, cambia el día.', en: 'A short walk, even in the cold, changes the day.' } },
    { tipo: 'adorno', texto: { es: 'El árbol está cada vez más bonito.', en: 'The tree is looking better and better.' } },
    { tipo: 'anim', anim: 'estrellas', texto: { es: 'Pide un deseo: vienen estrellas fugaces.', en: 'Make a wish: shooting stars are coming.' } },
    { tipo: 'frase', texto: { es: 'Los mejores regalos no caben en una caja.', en: "The best gifts don't fit in a box." } },
    { tipo: 'adorno', texto: { es: 'El último adorno. ¡Ya casi es Nochebuena!', en: "The last ornament. It's almost Christmas Eve!" } },
    { tipo: 'anim', anim: 'nochebuena', texto: { es: '¡Feliz Nochebuena!', en: 'Merry Christmas Eve!' } }
  ];

  function temporadaDe(d) {
    // La temporada de adviento de diciembre de 2026 dura hasta el 6 de enero de 2027.
    if (d.getMonth() === 11) return d.getFullYear();
    if (d.getMonth() === 0 && d.getDate() <= 6) return d.getFullYear() - 1;
    return null;
  }
  /** Días que ya se pueden abrir (1..24). */
  function diasDisponibles() {
    var d = hoy(), temp = temporadaDe(d);
    if (temp === null) return 0;
    if (estado.adviento.temporada !== temp) { estado.adviento = { temporada: temp, abiertos: [] }; guardar(); }
    if (d.getMonth() === 11 && d.getDate() <= 24) return d.getDate();
    return 24;
  }
  function regalosPendientes() {
    var n = diasDisponibles(), lista = [];
    for (var dia = n; dia >= 1; dia--) if (estado.adviento.abiertos.indexOf(dia) < 0) lista.push(dia);
    return lista; // del más reciente al más antiguo
  }
  function abrirRegalo(dia) {
    if (estado.adviento.abiertos.indexOf(dia) >= 0) return null;
    estado.adviento.abiertos.push(dia);
    var res = { dia: dia, sorpresa: SORPRESAS[dia], logros: [] };
    if (logro('primerRegalo')) res.logros.push('primerRegalo');
    if (estado.adviento.abiertos.length >= 24 && logro('adviento')) res.logros.push('adviento');
    guardar();
    return res;
  }
  /** Adornos ganados: un número por cada regalo de tipo adorno ya abierto, en orden de día. */
  function adornosGanados() {
    if (temporadaDe(hoy()) === null && estado.adviento.temporada === null) return 0;
    var n = 0;
    for (var dia = 1; dia <= 24; dia++) {
      if (SORPRESAS[dia].tipo === 'adorno' && estado.adviento.abiertos.indexOf(dia) >= 0) n++;
    }
    return n;
  }
  function arcoirisDesbloqueado() { return estado.adviento.abiertos.indexOf(18) >= 0; }
  function antesDeAdviento() {
    var d = hoy();
    return d.getMonth() === 10; // noviembre
  }

  // ---------- Logros ----------
  var LOGROS = {
    primerArbol: { es: 'Primer árbol encendido', en: 'First tree lit' },
    racha3: { es: 'Árbol encendido 3 días seguidos', en: 'Tree lit 3 days in a row' },
    racha7: { es: 'Árbol encendido 7 días seguidos', en: 'Tree lit 7 days in a row' },
    primerCopo: { es: 'Primer copo dorado', en: 'First golden snowflake' },
    copos10: { es: '10 copos dorados', en: '10 golden snowflakes' },
    primerRegalo: { es: 'Primer regalo abierto', en: 'First present opened' },
    adviento: { es: 'Calendario de adviento completo', en: 'Advent calendar complete' }
  };
  /** Marca un logro. Devuelve true si es nuevo. */
  function logro(id) {
    if (estado.logros[id]) return false;
    estado.logros[id] = claveDia(hoy());
    return true;
  }

  // ---------- Textos de la interfaz ----------
  var TEXTOS = {
    copoDorado: { es: '¡Copo dorado!', en: 'Golden snowflake!' },
    desbloqueado: { es: 'Desbloqueado: ', en: 'Unlocked: ' },
    faltan: { es: 'Siguiente premio con {n} copos', en: 'Next reward at {n} snowflakes' },
    arbolEncendido: { es: '¡Árbol encendido!', en: 'Tree lit!' },
    logro: { es: 'Logro', en: 'Achievement' },
    regaloDia: { es: 'Regalo del día {n}', en: 'Present for day {n}' },
    vuelveManana: { es: 'Mañana hay otro regalo.', en: "There's another present tomorrow." },
    empiezaAdviento: { es: 'El calendario de adviento empieza el 1 de diciembre.', en: 'The advent calendar starts on 1 December.' },
    racha: { es: '{n} días seguidos', en: '{n} days in a row' },
    unDia: { es: '1 día', en: '1 day' },
    enciende: { es: 'Toca las bombillas para encender el árbol', en: 'Touch the bulbs to light up the tree' }
  };
  function texto(id, n) { return t(TEXTOS[id]).replace('{n}', n); }

  function reiniciar() {
    estado = nuevo();
    guardar();
  }

  global.Juego = {
    EN: EN, t: t, texto: texto, hoy: hoy, claveDia: claveDia,
    lucesDeHoy: lucesDeHoy, encender: encender, arbolCompleto: arbolCompleto, rachaActual: rachaActual,
    get copos() { return estado.copos; },
    sumarCopo: sumarCopo, desbloqueado: desbloqueado, siguienteDesbloqueo: siguienteDesbloqueo,
    regalosPendientes: regalosPendientes, abrirRegalo: abrirRegalo, adornosGanados: adornosGanados,
    arcoirisDesbloqueado: arcoirisDesbloqueado, antesDeAdviento: antesDeAdviento, diasDisponibles: diasDisponibles,
    nombreLogro: function (id) { return LOGROS[id] ? t(LOGROS[id]) : id; },
    reiniciar: reiniciar
  };
})(window);
