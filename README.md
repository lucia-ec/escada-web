# ESCADA — Deja tu estela

Landing de maqueta para el Eau de Parfum ESCADA. HTML, CSS y JS estándar: sin dependencias de build ni de CDN.

## Cómo verla

Hace falta un servidor local. Abrir `index.html` con doble clic (`file://`) no sirve: el navegador bloquea la carga del modelo 3D y de su iluminación (el resto de la web sí se ve, y la página muestra un aviso).

```bash
node serve.mjs 8735
```

y abrir http://127.0.0.1:8735/ (cualquier servidor estático también vale, p. ej. `python3 -m http.server 8735`).

## Estructura

```
index.html          Marcado completo: hero, historia, ocasiones, notas + ritual, reseñas, compra y footer
css/styles.css      Sistema visual y animaciones (paleta ámbar/magenta/oro, Manrope + Instrument Serif)
js/main.js          Hero atado al scroll, control de vidrio, reveals, historia en canvas, selector de tamaño,
                    dial de la estela, escena fija de notas + ritual y lista de ocasiones
serve.mjs           Servidor de desarrollo sin dependencias
assets/
  hero/             106 fotogramas WebP (1600×900) del vídeo del hero: el scroll decide cuál se dibuja
  models/           Frasco 3D: escada_yum_me_sunny.glb (Draco), .usdz (AR en iOS) y estudio.hdr (iluminación)
  vendor/           model-viewer 4.3.1 y descompresor Draco 1.5.6, autoalojados
  fonts/            Manrope e Instrument Serif autoalojadas
  mujer-escada*.jpg Tres fotos editoriales generadas con IA (sección Ocasiones)
  escada-inicio.jpg Póster del hero · escada-final.jpg: fondo de la sección de compra
  favicon.svg
```

El visor 3D es `<model-viewer>`: iluminación `estudio.hdr`, órbita 0°/82°, FOV 22°, giro automático a 18°/s, sin sombra, sin interacción (no se puede girar ni ampliar) y fondo transparente.

## Hero atado al scroll

El hero es una escena fija de 400vh: mientras se hace scroll el contenido no se mueve y el vídeo avanza. En lugar de manipular `currentTime` (a saltos y poco fiable, sobre todo en Safari), se dibujan fotogramas ya extraídos en un `<canvas>`. Se cargan de grueso a fino (0, 105, cada 32, 16, 8, 4, 2, 1), así que siempre hay imagen en cualquier punto aunque la carga no haya terminado.

Para regenerar los fotogramas a partir del clip original de 7 s (no incluido en el repositorio), quedándose con uno de cada dos:

```bash
mkdir -p /tmp/f && ffmpeg -y -t 7 -i escada-estela.mp4 \
  -vf "select='not(mod(n\,2))+eq(n\,209)',scale=1600:900:flags=lanczos" -fps_mode passthrough /tmp/f/f%03d.png
python3 -c "
from PIL import Image; import glob
for i,f in enumerate(sorted(glob.glob('/tmp/f/f*.png'))): Image.open(f).convert('RGB').save('assets/hero/f%03d.webp'%i,'WEBP',quality=82,method=6)"
```

Si cambia el número de fotogramas, hay que ajustar `N` en `initVideo()` de `js/main.js`.

## Accesibilidad y preferencias

- `prefers-reduced-motion`: sin escenas fijas ni bucles; se ve el póster estático y la historia pasa a modo estático.
- `aria-live` en el hero y el dial, `radiogroup` con flechas en el selector de tamaño, pestañas ARIA con roving tabindex en el dial, desplegable accesible en las ocasiones y foco visible en todo.
- Breakpoints de móvil a 700 px y de pantalla baja a 520 px de alto.
