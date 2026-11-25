/*
 * escena.js · Navidad · Dónde va cada cosa.
 *
 * Posiciones del árbol: fracciones (0 a 1) de la imagen ORIGINAL originales-ia/navidad/arbol.jpeg
 * (aunque la herramienta la recorte, las posiciones siguen valiendo).
 * Las bombillas salen de herramientas/detectar_bombillas.py, revisadas a mano.
 * Para colocar luces y adornos sobre un árbol nuevo, abre index.html?editar=1 en el navegador:
 * haz clic para añadir, clic sobre un punto para quitarlo, y copia el resultado aquí.
 */
window.ESCENA = {
  // Dónde se coloca el árbol en la pantalla (fracciones del ancho y del alto)
  arbol: {
    x: 0.78,        // centro horizontal
    base: 0.925,    // borde inferior de la imagen (por encima de la barra de tareas)
    alto: 0.8,      // alto de la imagen
    vertical: { x: 0.66, base: 0.95, alto: 0.55 }, // en pantallas verticales

    tamLuz: 0.0135, // radio de una bombilla, en fracción del alto del árbol

    // Bombillas apagadas del dibujo, sobre la guirnalda dorada (30)
    luces: [[0.4904,0.2446],[0.5292,0.2177],[0.4557,0.2847],[0.5429,0.3255],[0.5549,0.3073],[0.5132,0.3507],[0.4414,0.3953],[0.4726,0.3735],[0.4277,0.4115],[0.5427,0.4773],[0.5669,0.459],[0.4285,0.5251],[0.4619,0.5145],[0.5027,0.4981],[0.4114,0.531],[0.3962,0.644],[0.4209,0.6425],[0.4556,0.6433],[0.5829,0.6444],[0.6021,0.6223],[0.5001,0.6511],[0.5474,0.6556],[0.6199,0.7109],[0.6129,0.7318],[0.5413,0.7864],[0.5801,0.7655],[0.3837,0.8142],[0.411,0.8136],[0.4496,0.81],[0.4947,0.8019]],

    // Estrella de la punta: [x, y, alto en fracción del alto del árbol]
    estrella: [0.4996, 0.078, 0.11],
    estrellaEnArbol: true,  // el dibujo ya trae la estrella: al encender solo se le añade brillo

    // Huecos para los adornos del calendario de adviento (se rellenan en orden)
    adornos: [[0.4924,0.2962],[0.4524,0.3385],[0.5233,0.3906],[0.476,0.4557],[0.5451,0.5208],[0.436,0.5729],[0.4978,0.5534],[0.5596,0.612],[0.4179,0.6901],[0.5305,0.7161],[0.4797,0.7682],[0.5814,0.8138]],

    // Regalos del adviento junto a los del dibujo: [centro x, borde inferior y, alto en fracción del alto del árbol]
    regalos: [[0.352,0.975,0.085],[0.452,0.99,0.075],[0.575,0.99,0.075],[0.655,0.975,0.09]]
  },

  // Cielo y aldea, en fracciones de plano.jpeg (la imagen de fondo)
  plano: {
    luna: [0.215, 0.184],    // centro de la luna (para el trineo)
    horizonte: 0.57,         // por debajo no se lanzan fuegos artificiales
    chimeneas: [[0.1483,0.431],[0.3118,0.4948],[0.3372,0.5488],[0.4041,0.6133],[0.149,0.6393]],
    ventanas: [[0.1025,0.5013],[0.1842,0.4961],[0.1682,0.5521],[0.129,0.6315],[0.141,0.7207],[0.1955,0.791],[0.2562,0.5423],[0.286,0.5443],[0.3009,0.6048],[0.3125,0.6556],[0.3605,0.6882],[0.3681,0.7422],[0.3924,0.7435],[0.4153,0.7389],[0.2544,0.6289],[0.3147,0.7331],[0.3481,0.7975]]
  },

  // Muñeco de nieve (se desbloquea con copos dorados): fracciones de la pantalla
  muneco: { x: 0.56, base: 0.93, alto: 0.17 }
};
