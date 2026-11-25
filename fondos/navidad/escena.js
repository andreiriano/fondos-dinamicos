/*
 * escena.js · Navidad · Dónde va cada cosa.
 *
 * Posiciones del árbol: fracciones (0 a 1) de la imagen ORIGINAL originales-ia/navidad/arbol.png
 * (aunque la herramienta la recorte, las posiciones siguen valiendo).
 * Para colocar luces y adornos sobre un árbol nuevo, abre index.html?editar=1 en el navegador:
 * haz clic para añadir, clic sobre un punto para quitarlo, y copia el resultado aquí.
 */
window.ESCENA = {
  // Dónde se coloca el árbol en la pantalla (fracciones del ancho y del alto)
  arbol: {
    x: 0.79,        // centro horizontal
    base: 0.93,     // borde inferior de la imagen (por encima de la barra de tareas)
    alto: 0.76,     // alto de la imagen
    vertical: { x: 0.66, base: 0.95, alto: 0.55 }, // en pantallas verticales

    tamLuz: 0.011,  // radio de una bombilla, en fracción del alto del árbol

    // Bombillas, sobre las guirnaldas del dibujo
    luces: [[0.402,0.1611],[0.451,0.1864],[0.5,0.204],[0.549,0.212],[0.598,0.2123],[0.3648,0.2958],[0.4205,0.3213],[0.4682,0.3391],[0.5239,0.3533],[0.5795,0.3604],[0.6272,0.3621],[0.324,0.4298],[0.3826,0.4544],[0.4413,0.4758],[0.5,0.4923],[0.5489,0.5019],[0.6076,0.5089],[0.6663,0.5123],[0.2911,0.5676],[0.3491,0.59],[0.4071,0.6105],[0.4652,0.6278],[0.5232,0.6415],[0.5812,0.6514],[0.6393,0.658],[0.6973,0.6625],[0.2582,0.7054],[0.3119,0.7249],[0.3791,0.7476],[0.4328,0.7637],[0.5,0.7806],[0.5537,0.7914],[0.6075,0.7999],[0.6746,0.8078],[0.7284,0.8126]],

    // Estrella de la punta: [x, y, alto en fracción del alto del árbol]
    estrella: [0.5, 0.05, 0.11],

    // Huecos para los adornos del calendario de adviento (se rellenan en orden)
    adornos: [[0.4341,0.2422],[0.5659,0.2522],[0.4145,0.4094],[0.5855,0.4194],[0.3817,0.5666],[0.5394,0.5566],[0.6183,0.5766],[0.3596,0.7138],[0.5468,0.7238],[0.6404,0.7238],[0.4133,0.8609],[0.5867,0.8609]],

    // Regalos bajo el árbol: [centro x, borde inferior y, alto en fracción del alto del árbol]
    regalos: [[0.15,0.99,0.12],[0.4,1.0,0.15],[0.65,0.995,0.1],[0.81,0.99,0.13]]
  },

  // Cielo y suelo, en fracciones de plano.png (la imagen de fondo)
  plano: {
    luna: [0.27, 0.17],     // centro de la luna (para el trineo)
    horizonte: 0.62          // por debajo no se lanzan fuegos artificiales
  },

  // Muñeco de nieve (se desbloquea con copos dorados): fracciones de la pantalla
  muneco: { x: 0.57, base: 0.965, alto: 0.2 }
};
