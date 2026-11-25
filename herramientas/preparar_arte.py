"""Prepara el arte generado con IA (Gemini, Veo...) para un fondo.

Uso (desde la carpeta del repositorio):
    py herramientas/preparar_arte.py navidad
    py herramientas/preparar_arte.py navidad --origen originales-ia/navidad-provisional

Lee originales-ia/<fondo>/ y escribe fondos/<fondo>/arte/:

  plano.png/.jpg   -> arte/plano.webp            (imagen de fondo, máx. 3840 px)
  plano-loop.mp4   -> arte/plano.mp4 + plano.webm (H.264 y VP9, sin audio, < ~8 MB cada uno;
                                                   se quita el último fotograma si repite el primero)
  arbol.png        -> arte/arbol.webp            (sin el verde, recortado, con transparencia)
  sprites.png      -> arte/<nombre>.webp         (cada objeto recortado por separado)
  todo             -> arte/arte.js               (tamaños y lista de archivos para el fondo)

Fondo liso (verde #00FF00, magenta #FF00FF...): se detecta el color del borde, se calcula la transparencia por distancia a
ese color, se "desmezcla" el verde de los bordes (sin halo verde) y se quitan motas sueltas.

Sprites: los objetos se separan solos. Se guarda originales-ia/<fondo>/_sprites-indice.png con un número
encima de cada uno. Para darles nombre, crea originales-ia/<fondo>/sprites.txt con líneas como:
    1 = regalo-rojo
    2 = estrella
Nombres que entiende el fondo de Navidad: regalo-*, estrella, adorno-*, copo-dorado, trineo, muneco.
Sin sprites.txt se llaman sprite-01, sprite-02...

Necesita Pillow (ya instalado) y, para el vídeo, ffmpeg (en el PATH o instalado con winget).
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
from collections import deque

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageMath

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIMITE_VIDEO = 7.8 * 1024 * 1024  # bytes, para quedar por debajo de ~8 MB


# ---------------------------------------------------------------- fondo verde
def color_clave(img):
    """Color del fondo: mediana de los píxeles del borde."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    paso = max(1, min(w, h) // 200)
    muestras = []
    for x in range(0, w, paso):
        muestras.append(rgb.getpixel((x, 0)))
        muestras.append(rgb.getpixel((x, h - 1)))
    for y in range(0, h, paso):
        muestras.append(rgb.getpixel((0, y)))
        muestras.append(rgb.getpixel((w - 1, y)))
    canales = list(zip(*muestras))
    return tuple(sorted(c)[len(c) // 2] for c in canales)


def _exceso(canales, clave):
    """Cuánto "se parece al color de fondo" un píxel, sea cual sea ese color.

    Canales altos del fondo (p. ej. G en #00FF00, R y B en #FF00FF) menos canales bajos:
    min(altos) - max(bajos). Un rojo, un blanco o un dorado dan valores bajos aunque estén cerca.
    Devuelve None si el fondo no tiene canales altos y bajos (gris, blanco...).
    """
    altos = [c for c, k in zip(canales, clave) if k >= 128]
    bajos = [c for c, k in zip(canales, clave) if k < 128]
    if not altos or not bajos:
        return None
    mm = ImageMath.lambda_eval
    def minimo(lista):
        m = lista[0]
        for c in lista[1:]:
            m = mm(lambda a: a["min"](a["x"], a["y"]), x=m, y=c)
        return m
    def maximo(lista):
        m = lista[0]
        for c in lista[1:]:
            m = mm(lambda a: a["max"](a["x"], a["y"]), x=m, y=c)
        return m
    return mm(lambda a: a["x"] - a["y"], x=minimo(altos), y=maximo(bajos))


def rellenar_huecos(alfa, dist, t0, minimo=80):
    """Rellena "huecos" interiores que no son fondo de verdad (brillos de una bola parecidos al fondo).

    Un hueco es una zona semitransparente que no toca el borde de la imagen. Si dentro hay algún píxel
    del color de fondo puro (distancia < t0), es un hueco real (entre ramas, en los patines del trineo)
    y se respeta; si no, era un reflejo y se vuelve opaco.
    """
    w, h = alfa.size
    a = bytearray(alfa.tobytes())
    d = dist.point(lambda v: v).convert("L").tobytes() if dist.mode != "L" else dist.tobytes()
    bajo = 255  # todo lo que no es opaco del todo
    visto = bytearray(w * h)
    rellenados = 0
    for inicio in range(w * h):
        if a[inicio] >= bajo or visto[inicio]:
            continue
        cola = deque([inicio])
        visto[inicio] = 1
        zona = []
        toca_borde = puro = False
        while cola:
            i = cola.popleft()
            zona.append(i)
            x, y = i % w, i // w
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                toca_borde = True
            if d[i] < t0:
                puro = True
            for j in (i - 1 if x > 0 else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < w * h and not visto[j] and a[j] < bajo:
                    visto[j] = 1
                    cola.append(j)
        if not toca_borde and not puro and (len(zona) <= 12 or minimo <= len(zona) < w * h // 20):
            for i in zona:
                a[i] = 255
            rellenados += len(zona)
    if rellenados:
        print(f"  (rellenados {rellenados} px de brillos que se confundían con el fondo)")
    return Image.frombytes("L", (w, h), bytes(a))


def quitar_verde(img, clave=None, t0=70, t1=200, huecos=False):
    """Devuelve una imagen RGBA sin el fondo liso de color `clave` (verde, magenta, azul...).

    La transparencia sale de la distancia (suma de diferencias por canal) al color clave:
    <= t0 transparente, >= t1 opaco, en medio semitransparente. En los bordes semitransparentes se
    recupera el color real quitando la parte de fondo mezclada: F = K + (C - K) / alfa.
    """
    rgb = img.convert("RGB")
    if clave is None:
        clave = color_clave(rgb)
    kr, kg, kb = clave
    r, g, b = rgb.split()
    mm = ImageMath.lambda_eval
    dist = mm(lambda a: abs(a["r"] - kr) + abs(a["g"] - kg) + abs(a["b"] - kb), r=r, g=g, b=b)
    # Protección: lo que no tiene "el tono del fondo" es siempre opaco (blancos, rojos, dorados...)
    exceso = _exceso([r, g, b], clave)
    if exceso is None:
        exceso = mm(lambda a: a["d"] * 0 + 255, d=dist)
    alfa = mm(
        lambda a: a["convert"](
            a["max"](
                a["min"](a["max"]((a["d"] - t0) * 255 / (t1 - t0), 0), 255),
                (a["e"] < 25) * 255,
            ),
            "L",
        ),
        d=dist,
        e=exceso,
    )
    # quitar alfas residuales muy bajas (ruido del fondo)
    alfa = alfa.point(lambda v: 0 if v < 18 else v)
    if huecos:
        alfa = rellenar_huecos(alfa, dist, t0)

    def desmezclar(canal, k):
        return mm(
            lambda a: a["convert"](
                a["min"](a["max"](k + (a["float"](a["c"]) - k) * 255 / a["max"](a["al"], 1), 0), 255), "L"
            ),
            c=canal,
            al=alfa,
        )

    canales = [desmezclar(r, kr), desmezclar(g, kg), desmezclar(b, kb)]
    # Quitar el tono del fondo que pueda quedar en el borde exterior (halo): en una franja junto a la
    # transparencia, a los canales "altos" del fondo se les resta lo que sobresalen de los "bajos".
    ex2 = _exceso(canales, clave)
    if ex2 is not None:
        borde = alfa.point(lambda v: 255 if v < 250 else 0).filter(ImageFilter.MaxFilter(7))
        sobra = mm(lambda a: a["max"](a["e"], 0), e=ex2)
        limpios = []
        for c, k in zip(canales, clave):
            if k >= 128:
                c2 = mm(lambda a: a["convert"](a["max"](a["c"] - a["s"], 0), "L"), c=c, s=sobra)
                c = Image.composite(c2, c, borde)
            limpios.append(c)
        canales = limpios
    salida = Image.merge("RGBA", (canales[0], canales[1], canales[2], alfa))
    # encoger 1 px el borde (evita una línea clara alrededor)
    choke = alfa.filter(ImageFilter.MinFilter(3))
    alfa_final = Image.blend(alfa, choke, 0.5)
    salida.putalpha(alfa_final)
    return salida, clave


def buscar_original(carpeta, base):
    """plano.png, plano.jpg, plano.jpeg o plano.webp (lo primero que exista)."""
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        ruta = os.path.join(carpeta, base + ext)
        if os.path.isfile(ruta):
            return ruta
    return None


# ---------------------------------------------------------- objetos separados
def componentes(mascara, minimo):
    """Etiqueta zonas conectadas de una máscara 'L' pequeña. Devuelve [(area, (x0,y0,x1,y1))]."""
    w, h = mascara.size
    datos = mascara.tobytes()
    visto = bytearray(w * h)
    zonas = []
    for inicio in range(w * h):
        if datos[inicio] < 128 or visto[inicio]:
            continue
        cola = deque([inicio])
        visto[inicio] = 1
        area, x0, y0, x1, y1 = 0, w, h, 0, 0
        while cola:
            i = cola.popleft()
            x, y = i % w, i // w
            area += 1
            x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
            for j in (i - 1 if x > 0 else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < w * h and not visto[j] and datos[j] >= 128:
                    visto[j] = 1
                    cola.append(j)
        if area >= minimo:
            zonas.append((area, (x0, y0, x1 + 1, y1 + 1)))
    return zonas


def mascara_pequena(rgba, lado=700, union=7):
    w, h = rgba.size
    f = min(1.0, lado / max(w, h))
    peq = rgba.getchannel("A").resize((max(1, int(w * f)), max(1, int(h * f))), Image.BILINEAR)
    peq = peq.point(lambda v: 255 if v > 60 else 0)
    if union > 1:
        peq = peq.filter(ImageFilter.MaxFilter(union))  # une piezas cercanas (lazo y caja de un regalo)
    return peq, f


def limpiar_motas(rgba, proporcion=0.02):
    """Deja solo los objetos grandes (quita motas sueltas del fondo)."""
    peq, f = mascara_pequena(rgba, union=5)
    zonas = componentes(peq, 4)
    if not zonas:
        return rgba
    mayor = max(a for a, _ in zonas)
    conservar = Image.new("L", peq.size, 0)
    d = ImageDraw.Draw(conservar)
    for area, caja in zonas:
        if area >= mayor * proporcion:
            d.rectangle(caja, fill=255)
    conservar = conservar.filter(ImageFilter.MaxFilter(5)).resize(rgba.size, Image.NEAREST)
    alfa = ImageChops.multiply(rgba.getchannel("A"), conservar)
    rgba = rgba.copy()
    rgba.putalpha(alfa)
    return rgba


def recortar(rgba, margen=4, con_caja=False):
    caja = rgba.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    w, h = rgba.size
    if not caja:
        return (rgba, (0, 0, w, h)) if con_caja else rgba
    x0, y0, x1, y1 = caja
    caja = (max(0, x0 - margen), max(0, y0 - margen), min(w, x1 + margen), min(h, y1 + margen))
    return (rgba.crop(caja), caja) if con_caja else rgba.crop(caja)


def separar_sprites(rgba):
    peq, f = mascara_pequena(rgba, union=9)
    total = peq.size[0] * peq.size[1]
    zonas = componentes(peq, max(30, total // 2000))
    # orden de lectura: filas de arriba abajo, y en cada fila de izquierda a derecha
    zonas.sort(key=lambda z: (z[1][1] + z[1][3]) / 2)
    filas, actual, alto_ref = [], [], None
    for z in zonas:
        cy = (z[1][1] + z[1][3]) / 2
        alto = z[1][3] - z[1][1]
        if actual and abs(cy - alto_ref[0]) > max(alto_ref[1], alto) * 0.6:
            filas.append(actual)
            actual = []
        if not actual:
            alto_ref = (cy, alto)
        actual.append(z)
    if actual:
        filas.append(actual)
    ordenadas = [z for fila in filas for z in sorted(fila, key=lambda z: z[1][0])]
    piezas = []
    W, H = rgba.size
    for area, (x0, y0, x1, y1) in ordenadas:
        caja = (max(0, int(x0 / f) - 6), max(0, int(y0 / f) - 6), min(W, int(x1 / f) + 6), min(H, int(y1 / f) + 6))
        piezas.append((caja, recortar(rgba.crop(caja))))
    return piezas


def hoja_indice(rgba, piezas, destino):
    fondo = Image.new("RGBA", rgba.size, (40, 44, 60, 255))
    for x in range(0, rgba.size[0], 32):
        for y in range(0, rgba.size[1], 32):
            if (x // 32 + y // 32) % 2:
                fondo.paste((55, 60, 80, 255), (x, y, x + 32, y + 32))
    fondo.alpha_composite(rgba)
    d = ImageDraw.Draw(fondo)
    try:
        fuente = ImageFont.truetype("arialbd.ttf", max(24, rgba.size[0] // 50))
    except OSError:
        fuente = ImageFont.load_default()
    for i, (caja, _) in enumerate(piezas, 1):
        d.rectangle(caja, outline=(255, 210, 60, 255), width=3)
        d.text((caja[0] + 8, caja[1] + 4), str(i), fill=(255, 230, 90, 255), font=fuente, stroke_width=3, stroke_fill=(0, 0, 0, 255))
    fondo.convert("RGB").save(destino, quality=85)


def leer_nombres(ruta):
    nombres = {}
    if not os.path.isfile(ruta):
        return nombres
    with open(ruta, encoding="utf-8") as f:
        for linea in f:
            linea = linea.split("#", 1)[0].strip()
            if "=" not in linea:
                continue
            num, nombre = (p.strip() for p in linea.split("=", 1))
            if num.isdigit() and nombre:
                nombres[int(num)] = "".join(c for c in nombre.lower().replace(" ", "-") if c.isalnum() or c in "-_")
    return nombres


# ------------------------------------------------------------------- guardar
def guardar_webp(img, ruta, calidad=86, max_lado=None):
    if max_lado and max(img.size) > max_lado:
        f = max_lado / max(img.size)
        img = img.resize((round(img.size[0] * f), round(img.size[1] * f)), Image.LANCZOS)
    if img.mode == "RGBA":
        img.save(ruta, "WEBP", quality=calidad, alpha_quality=100, method=6)
    else:
        img.convert("RGB").save(ruta, "WEBP", quality=calidad, method=6)
    return img.size


# --------------------------------------------------------------------- vídeo
def buscar_ffmpeg():
    ff = shutil.which("ffmpeg")
    if ff:
        return ff, shutil.which("ffprobe") or ff.replace("ffmpeg", "ffprobe")
    base = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WinGet", "Packages")
    for ruta in glob.glob(os.path.join(base, "*FFmpeg*", "**", "bin", "ffmpeg.exe"), recursive=True):
        return ruta, ruta.replace("ffmpeg.exe", "ffprobe.exe")
    return None, None


def info_video(ffprobe, ruta):
    salida = subprocess.run(
        [ffprobe, "-v", "error", "-select_streams", "v:0", "-count_frames",
         "-show_entries", "stream=width,height,nb_read_frames,r_frame_rate", "-of", "json", ruta],
        capture_output=True, text=True, check=True,
    )
    s = json.loads(salida.stdout)["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return int(s["width"]), int(s["height"]), int(s.get("nb_read_frames", 0)), float(num) / float(den)


def ultimo_igual_al_primero(ffmpeg, ruta, n, tmp):
    a, b = os.path.join(tmp, "_f0.png"), os.path.join(tmp, "_fn.png")
    subprocess.run([ffmpeg, "-v", "error", "-y", "-i", ruta, "-vf", "select=eq(n\\,0)", "-frames:v", "1", a], check=True)
    subprocess.run([ffmpeg, "-v", "error", "-y", "-i", ruta, "-vf", f"select=eq(n\\,{n - 1})", "-frames:v", "1", b], check=True)
    with Image.open(a) as ia, Image.open(b) as ib:
        dif = ImageChops.difference(ia.convert("RGB").resize((160, 90)), ib.convert("RGB").resize((160, 90)))
        media = sum(dif.convert("L").tobytes()) / (160 * 90)
    os.remove(a)
    os.remove(b)
    return media < 6


def codificar(ffmpeg, origen, destino, filtro, args_base, calidades):
    for q in calidades:
        cmd = [ffmpeg, "-v", "error", "-y", "-i", origen, "-an", "-vf", filtro] + [x.replace("{q}", str(q)) for x in args_base] + [destino]
        subprocess.run(cmd, check=True)
        tam = os.path.getsize(destino)
        if tam <= LIMITE_VIDEO:
            return q, tam
    return q, tam


def procesar_video(origen, carpeta_arte):
    ffmpeg, ffprobe = buscar_ffmpeg()
    if not ffmpeg:
        print("  (aviso) no encuentro ffmpeg: no se procesa el vídeo")
        return None
    w, h, n, fps = info_video(ffprobe, origen)
    quitar_ultimo = n > 10 and ultimo_igual_al_primero(ffmpeg, origen, n, carpeta_arte)
    filtros = []
    if quitar_ultimo:
        filtros.append(f"select=lt(n\\,{n - 1}),setpts=N/FRAME_RATE/TB")
    filtros.append("scale='min(1920,iw)':-2:flags=lanczos")
    filtro = ",".join(filtros)
    mp4 = os.path.join(carpeta_arte, "plano.mp4")
    webm = os.path.join(carpeta_arte, "plano.webm")
    q1, t1 = codificar(ffmpeg, origen, mp4, filtro,
                       ["-c:v", "libx264", "-preset", "slow", "-crf", "{q}", "-pix_fmt", "yuv420p", "-movflags", "+faststart"],
                       [20, 23, 26, 29, 32])
    q2, t2 = codificar(ffmpeg, origen, webm, filtro,
                       ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "{q}", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2"],
                       [30, 34, 38, 42, 46])
    print(f"  vídeo {w}x{h}, {n} fotogramas a {fps:.0f} fps" + (" (quitado el último, repetía el primero)" if quitar_ultimo else ""))
    print(f"  -> arte/plano.mp4 ({t1 / 1048576:.1f} MB, crf {q1}) y arte/plano.webm ({t2 / 1048576:.1f} MB, crf {q2})")
    return {"mp4": "arte/plano.mp4", "webm": "arte/plano.webm"}


# ---------------------------------------------------------------------- main
def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    p = argparse.ArgumentParser(description="Prepara el arte de IA de un fondo")
    p.add_argument("fondo", help="nombre del fondo, p. ej. navidad")
    p.add_argument("--origen", help="carpeta con los originales (por defecto originales-ia/<fondo>)")
    p.add_argument("--sin-video", action="store_true", help="no procesar el vídeo")
    a = p.parse_args()

    origen = os.path.join(RAIZ, a.origen) if a.origen else os.path.join(RAIZ, "originales-ia", a.fondo)
    arte = os.path.join(RAIZ, "fondos", a.fondo, "arte")
    if not os.path.isdir(origen):
        sys.exit(f"No existe {origen}")
    os.makedirs(arte, exist_ok=True)
    manifiesto = {"plano": None, "video": None, "arbol": None, "sprites": {}}

    ruta = buscar_original(origen, "plano")
    if ruta:
        with Image.open(ruta) as img:
            tam = guardar_webp(img.convert("RGB"), os.path.join(arte, "plano.webp"), calidad=82, max_lado=3840)
        manifiesto["plano"] = {"archivo": "arte/plano.webp", "w": tam[0], "h": tam[1]}
        print(f"{os.path.basename(ruta)} -> arte/plano.webp {tam[0]}x{tam[1]} ({os.path.getsize(os.path.join(arte, 'plano.webp')) // 1024} KB)")

    ruta = os.path.join(origen, "plano-loop.mp4")
    if os.path.isfile(ruta) and not a.sin_video:
        print("plano-loop.mp4")
        manifiesto["video"] = procesar_video(ruta, arte)

    ruta = buscar_original(origen, "arbol")
    if ruta:
        with Image.open(ruta) as img:
            sin_verde, clave = quitar_verde(img)
        limpio, caja = recortar(limpiar_motas(sin_verde), con_caja=True)
        tam = guardar_webp(limpio, os.path.join(arte, "arbol.webp"), calidad=88, max_lado=2400)
        # "recorte" y "original" permiten dar posiciones (luces, estrella...) sobre arbol.png original
        manifiesto["arbol"] = {"archivo": "arte/arbol.webp", "w": tam[0], "h": tam[1],
                               "original": list(sin_verde.size), "recorte": list(caja)}
        print(f"{os.path.basename(ruta)} (fondo #{clave[0]:02X}{clave[1]:02X}{clave[2]:02X}) -> arte/arbol.webp {tam[0]}x{tam[1]} "
              f"({os.path.getsize(os.path.join(arte, 'arbol.webp')) // 1024} KB)")

    ruta = buscar_original(origen, "sprites")
    if ruta:
        with Image.open(ruta) as img:
            sin_verde, clave = quitar_verde(img, huecos=True)
        piezas = separar_sprites(sin_verde)
        hoja_indice(sin_verde, piezas, os.path.join(origen, "_sprites-indice.jpg"))
        nombres = leer_nombres(os.path.join(origen, "sprites.txt"))
        for viejo in glob.glob(os.path.join(arte, "*.webp")):
            base = os.path.basename(viejo)
            if base not in ("plano.webp", "arbol.webp"):
                os.remove(viejo)
        for i, (_, pieza) in enumerate(piezas, 1):
            nombre = nombres.get(i, f"sprite-{i:02d}")
            if nombre in ("-", "ignorar"):
                continue
            tam = guardar_webp(pieza, os.path.join(arte, nombre + ".webp"), calidad=88, max_lado=1024)
            manifiesto["sprites"][nombre] = {"archivo": f"arte/{nombre}.webp", "w": tam[0], "h": tam[1]}
        print(f"{os.path.basename(ruta)} -> {len(manifiesto['sprites'])} sprites: {', '.join(manifiesto['sprites'])}")
        print(f"  índice con números: {os.path.relpath(os.path.join(origen, '_sprites-indice.jpg'), RAIZ)}")

    with open(os.path.join(arte, "arte.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("// Generado por herramientas/preparar_arte.py. No editar a mano.\n")
        f.write("window.ARTE = " + json.dumps(manifiesto, indent=2, ensure_ascii=False) + ";\n")
    print("-> arte/arte.js")


if __name__ == "__main__":
    main()
