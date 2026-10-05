# ESCADA — Deja tu estela

Landing del Eau de Parfum en HTML, CSS y JS estándar (sin dependencias de build), convertida desde el "Design Component" original.

## Cómo verla

Se necesita un servidor local **con soporte de peticiones Range** para que el vídeo del hero pueda hacer seek (el `python3 -m http.server` no lo soporta y el vídeo se congela al cambiar de tramo):

**Lo más fácil:** doble clic en `Abrir ESCADA.command` (está en la carpeta `Proyecto ESCADA`, al lado de `escada-web`). Arranca el servidor y abre la web.

A mano:

```bash
node serve.mjs 8735
```

y abrir http://127.0.0.1:8735/

> No abras `index.html` con doble clic: desde `file://` el navegador bloquea la carga del modelo 3D y de su iluminación (el resto de la web sí se ve). La página muestra un aviso si detecta ese caso.

## Estructura

```
index.html        Marcado completo (hero, story, ocasiones, notas + ritual (escena fija que releva el contenido al hacer scroll), reseñas, compra, footer)
css/styles.css    Sistema visual + animaciones (paleta ámbar/magenta/oro, Manrope + Instrument Serif)
js/main.js        Lógica: vídeo del hero atado al scroll (canvas + fotogramas), control de vidrio, reveals, story con
                  canvas, selector de tamaño y el dial de la estela (sección notas)
assets/models/    Frasco 3D (mismo setup que el viewer de Escada_Yum_Me_Sunny_3D):
                  escada_yum_me_sunny.glb   modelo (Draco, texturas embebidas)
                  escada_yum_me_sunny.usdz  modelo para AR en iOS (ios-src)
                  estudio.hdr               entorno de iluminación (environment-image)
                  El visor es <model-viewer> con la misma configuración: estudio.hdr,
                  órbita 0°/82°, FOV 22°, rotación 18°/s, sin sombra, sin interacción (no se puede girar ni ampliar), fondo transparente.
assets/
  mujer-escada.jpg        Foto editorial (generada con Higgsfield / Nano Banana Pro) de la sección Ocasiones
  hero/f000–f105.webp     106 fotogramas (1600×900) del vídeo del hero: el scroll decide cuál se dibuja
  escada-*.jpg            Fotogramas inicial y final (póster del hero y fondo de la compra)
  (el clip original escada-estela.mp4 ya no está aquí: vive en ../archivo-no-publicar/assets/, por si hay que regenerar los fotogramas)
  vendor/                 Visor 3D (model-viewer 4.3.1) y descompresor Draco 1.5.6, autoalojados: la web no depende de ningún CDN
  fonts/                  Manrope, Instrument Serif y Great Vibes autoalojadas
serve.mjs          Servidor de desarrollo con soporte Range
```

## Accesibilidad y preferencias

- `prefers-reduced-motion`: desactiva bucles, barridos y auto-avance; la story pasa a modo estático.
- `aria-live` para los anuncios del hero y del dial, `radiogroup` con flechas en el selector de tamaño,
  pestañas ARIA con roving tabindex en el dial, foco visible en todo.
- Breakpoints de móvil a 700 px y de pantalla baja a 520 px de alto.

## Vídeo del hero atado al scroll

El hero es una escena fija de 400vh: mientras se hace scroll, el contenido no se mueve y el vídeo avanza.
En lugar de manipular `currentTime` (a saltos y poco fiable, sobre todo en Safari), se dibujan fotogramas
ya extraídos en un `<canvas>`. Se cargan de grueso a fino (0, 105, cada 32, 16, 8, 4, 2, 1), de modo que
siempre hay imagen en cualquier punto aunque la carga no haya terminado. Con `prefers-reduced-motion`
no hay escena fija: se ve el póster estático.

Para regenerar los fotogramas si cambia el clip (tramo de ida, 7 s = 210 fotogramas, uno de cada dos):

```bash
mkdir -p /tmp/f && ffmpeg -y -t 7 -i ../archivo-no-publicar/assets/escada-estela.mp4 \
  -vf "select='not(mod(n\,2))+eq(n\,209)',scale=1600:900:flags=lanczos" -fps_mode passthrough /tmp/f/f%03d.png
python3 -c "
from PIL import Image; import glob
for i,f in enumerate(sorted(glob.glob('/tmp/f/f*.png'))): Image.open(f).convert('RGB').save('assets/hero/f%03d.webp'%i,'WEBP',quality=82,method=6)"
```

Si cambia el número de fotogramas, hay que ajustar `N` en `initVideo()` de `js/main.js`.

## Publicar

Se publica **solo el contenido de `escada-web`**. No hace falta subir `serve.mjs` (servidor de desarrollo) ni este README.
Es una web estática: cualquier hosting sirve (Netlify, Vercel, GitHub Pages, servidor propio).

Antes de publicar:
- Poner la dirección completa en `og:image` (y añadir `og:url`) en `index.html`: las redes sociales no leen rutas relativas.
- Sustituir los enlaces de ejemplo del footer (`href="#"`: Envíos y devoluciones, Contacto, Instagram, TikTok).
- Confirmar con el cliente precios, devoluciones y afirmaciones (vegano, sin pruebas en animales), y sustituir las reseñas de ejemplo por reseñas reales.
