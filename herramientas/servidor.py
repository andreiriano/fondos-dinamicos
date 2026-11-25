"""Servidor local para probar los fondos en el navegador.

Uso (desde la carpeta del repositorio):
    py herramientas/servidor.py          -> http://127.0.0.1:8000/
    py herramientas/servidor.py 8765     -> otro puerto

Es lo mismo que `py -m http.server`, con dos añadidos para desarrollo:
  - No guarda nada en caché (ves los cambios al recargar).
  - Acepta guardar la miniatura de un fondo (PUT .../thumbnail.jpg) desde la consola del
    navegador, para generar las imágenes de vista previa. Solo escucha en 127.0.0.1.
"""
import http.server
import os
import sys
from functools import partial

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARPETAS_PERMITIDAS = ("fondos", "plantilla-gif-video")


class Manejador(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_PUT(self):
        ruta = self.translate_path(self.path)
        relativa = os.path.relpath(ruta, RAIZ).replace("\\", "/")
        partes = relativa.split("/")
        valida = (
            len(partes) >= 2
            and partes[0] in CARPETAS_PERMITIDAS
            and partes[-1] == "thumbnail.jpg"
            and ".." not in partes
            and os.path.isdir(os.path.dirname(ruta))
        )
        if not valida:
            self.send_error(403, "Solo se puede guardar thumbnail.jpg dentro de un fondo")
            return
        largo = int(self.headers.get("Content-Length", 0))
        if largo <= 0 or largo > 5_000_000:
            self.send_error(400, "Tamaño no válido")
            return
        datos = self.rfile.read(largo)
        if not datos.startswith(b"\xff\xd8"):
            self.send_error(400, "No es un JPEG")
            return
        with open(ruta, "wb") as f:
            f.write(datos)
        self.send_response(201)
        self.end_headers()
        self.wfile.write(b"ok")


def main():
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    servidor = http.server.ThreadingHTTPServer(("127.0.0.1", puerto), partial(Manejador, directory=RAIZ))
    print(f"Sirviendo {RAIZ} en http://127.0.0.1:{puerto}/  (Ctrl+C para parar)")
    servidor.serve_forever()


if __name__ == "__main__":
    main()
