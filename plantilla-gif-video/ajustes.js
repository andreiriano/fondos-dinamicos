// Ajustes de tu fondo. Cambia los valores entre comillas o los números y guarda el archivo.
// (Dentro de Lively Wallpaper también puedes cambiarlos desde su menú de ajustes; ese menú tiene prioridad.)
window.AJUSTES = {
  // Nombre exacto de tu archivo. Déjalo vacío ('') para que busque solo
  // mi-fondo.mp4, .webm, .m4v, .gif, .webp, .jpg, .jpeg o .png
  archivo: '',

  // Efecto encima: 'ninguno', 'nieve', 'hojas', 'petalos', 'burbujas',
  // 'luciernagas', 'estrellas', 'confeti' o 'corazones'
  efecto: 'nieve',

  cantidad: 50,      // 0 a 100
  tamano: 100,       // 30 a 300 (porcentaje)
  velocidad: 100,    // 10 a 300 (porcentaje)
  fuerzaCursor: 60,  // 0 a 100: cuánto reacciona al ratón
  oscurecer: 0,      // 0 a 90: oscurece tu imagen para que el efecto resalte
  ajuste: 'cubrir',  // 'cubrir' (llena la pantalla), 'ajustar' (se ve entera) o 'estirar'
  fps: 30            // fotogramas por segundo del efecto (menos = gasta menos)
};
