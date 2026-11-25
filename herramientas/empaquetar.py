"""Prepara los fondos y crea un .zip por fondo, listo para arrastrar a Lively Wallpaper.

Uso (desde la carpeta del repositorio):
    py herramientas/empaquetar.py

Qué hace:
  1. Copia comun/motor.js dentro de cada fondo (cada carpeta debe funcionar sola).
  2. Comprueba LivelyInfo.json y LivelyProperties.json de cada fondo.
  3. Reduce la miniatura (thumbnail.jpg) a 960 px de ancho si es más grande (necesita Pillow).
  4. Crea descargas/<nombre>.zip con los archivos en la raíz del zip, como pide Lively.

Los zip salen siempre iguales si no cambia nada (fechas fijas), así git solo ve cambios reales.
"""
import json
import os
import shutil
import sys
import zipfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOTOR = os.path.join(RAIZ, "comun", "motor.js")
DESCARGAS = os.path.join(RAIZ, "descargas")

# carpeta -> nombre del zip
PAQUETES = {
    "fondos/navidad": "fondo-navidad.zip",
    "fondos/verano": "fondo-verano.zip",
    "fondos/otono": "fondo-otono.zip",
    "fondos/invierno": "fondo-invierno.zip",
    "plantilla-gif-video": "plantilla-gif-video.zip",
}

# No van dentro del zip
EXCLUIR_EXT = {".md", ".py", ".zip"}
EXCLUIR_NOMBRES = {"Thumbs.db", "desktop.ini", ".DS_Store"}

TIPOS_CONTROL = {"slider", "textbox", "dropdown", "folderDropdown", "button", "label", "color", "checkbox"}
FECHA_FIJA = (2026, 11, 24, 0, 0, 0)
ANCHO_MINIATURA = 960


def error(msg):
    print("  ERROR:", msg)
    return 1


def comprobar(carpeta):
    fallos = 0
    ruta_info = os.path.join(carpeta, "LivelyInfo.json")
    if not os.path.isfile(ruta_info):
        return error("falta LivelyInfo.json")
    try:
        with open(ruta_info, encoding="utf-8") as f:
            info = json.load(f)
    except ValueError as e:
        return error(f"LivelyInfo.json no es JSON válido: {e}")
    for campo in ("Title", "Desc", "Type", "FileName"):
        if campo not in info:
            fallos += error(f"LivelyInfo.json sin '{campo}'")
    if info.get("Type") != 1:
        fallos += error("LivelyInfo.json: Type debe ser 1 (página web)")
    if info.get("IsAbsolutePath"):
        fallos += error("LivelyInfo.json: IsAbsolutePath debe ser false")
    if not os.path.isfile(os.path.join(carpeta, str(info.get("FileName", "")))):
        fallos += error(f"no existe el archivo indicado en FileName: {info.get('FileName')}")
    miniatura = info.get("Thumbnail")
    if miniatura and not os.path.isfile(os.path.join(carpeta, miniatura)):
        fallos += error(f"no existe la miniatura {miniatura}")

    ruta_props = os.path.join(carpeta, "LivelyProperties.json")
    if os.path.isfile(ruta_props):
        try:
            with open(ruta_props, encoding="utf-8") as f:
                props = json.load(f)
        except ValueError as e:
            return fallos + error(f"LivelyProperties.json no es JSON válido: {e}")
        for nombre, control in props.items():
            if not nombre[:1].islower():
                fallos += error(f"LivelyProperties.json: '{nombre}' debe empezar en minúscula")
            if control.get("type") not in TIPOS_CONTROL:
                fallos += error(f"LivelyProperties.json: '{nombre}' tiene un tipo desconocido")
            if control.get("type") == "slider":
                for clave in ("min", "max", "step", "value", "text"):
                    if clave not in control:
                        fallos += error(f"LivelyProperties.json: al deslizador '{nombre}' le falta '{clave}'")
            if control.get("type") == "dropdown":
                items = control.get("items", [])
                if not isinstance(control.get("value"), int) or not 0 <= control["value"] < len(items):
                    fallos += error(f"LivelyProperties.json: el valor de '{nombre}' no está en la lista")

    for loc in ("LivelyInfo.loc.json", "LivelyProperties.loc.json"):
        ruta = os.path.join(carpeta, loc)
        if os.path.isfile(ruta):
            try:
                with open(ruta, encoding="utf-8") as f:
                    json.load(f)
            except ValueError as e:
                fallos += error(f"{loc} no es JSON válido: {e}")
    return fallos


def reducir_miniatura(carpeta):
    ruta = os.path.join(carpeta, "thumbnail.jpg")
    if not os.path.isfile(ruta):
        return
    try:
        from PIL import Image
    except ImportError:
        print("  (aviso) Pillow no está instalado: no se revisa el tamaño de la miniatura")
        return
    with Image.open(ruta) as img:
        if img.width <= ANCHO_MINIATURA:
            return
        alto = round(img.height * ANCHO_MINIATURA / img.width)
        pequeña = img.convert("RGB").resize((ANCHO_MINIATURA, alto), Image.LANCZOS)
    pequeña.save(ruta, quality=85, optimize=True, progressive=True)
    print(f"  miniatura reducida a {ANCHO_MINIATURA}x{alto}")


def archivos_del_paquete(carpeta):
    lista = []
    for actual, dirs, archivos in os.walk(carpeta):
        dirs[:] = sorted(d for d in dirs if not d.startswith("."))
        for nombre in sorted(archivos):
            if nombre.startswith(".") or nombre in EXCLUIR_NOMBRES:
                continue
            if os.path.splitext(nombre)[1].lower() in EXCLUIR_EXT:
                continue
            ruta = os.path.join(actual, nombre)
            lista.append((ruta, os.path.relpath(ruta, carpeta).replace("\\", "/")))
    return lista


def crear_zip(carpeta, destino):
    temporal = destino + ".tmp"
    with zipfile.ZipFile(temporal, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for ruta, nombre in archivos_del_paquete(carpeta):
            info = zipfile.ZipInfo(nombre, date_time=FECHA_FIJA)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            with open(ruta, "rb") as f:
                z.writestr(info, f.read())
    os.replace(temporal, destino)
    return os.path.getsize(destino)


def main():
    solo_sincronizar = "--solo-sincronizar" in sys.argv
    os.makedirs(DESCARGAS, exist_ok=True)
    fallos = 0
    for relativa, nombre_zip in PAQUETES.items():
        carpeta = os.path.join(RAIZ, relativa)
        print(f"{relativa}")
        if not os.path.isdir(carpeta):
            fallos += error("no existe la carpeta")
            continue
        shutil.copyfile(MOTOR, os.path.join(carpeta, "motor.js"))
        if solo_sincronizar:
            continue
        reducir_miniatura(carpeta)
        problemas = comprobar(carpeta)
        fallos += problemas
        if problemas:
            print("  no se crea el zip hasta corregir los errores")
            continue
        tam = crear_zip(carpeta, os.path.join(DESCARGAS, nombre_zip))
        print(f"  -> descargas/{nombre_zip} ({tam / 1024:.0f} KB)")
    if fallos:
        print(f"\nTerminado con {fallos} error(es).")
        sys.exit(1)
    print("\nListo.")


if __name__ == "__main__":
    main()
