# Cómo entrenar a mi dragón

App web ligera para "gestionar" a tu pareja (el dragón) con ayuda de una IA entrenada con sus fichas. Datos de ejemplo ficticios. Sin backend, sin base de datos y sin APIs externas: todo funciona en el navegador y se guarda en `localStorage`.

Publicada en GitHub Pages: https://galeseim-beep.github.io/Prueba-code/

## Qué incluye

- **Perfil del dragón** editable (nombre y trato: él / ella / elle) con su estado de ánimo actual.
- **4 indicadores**: nivel de domesticación, riesgo de incendio (según la hora y las alertas recientes), días sin incendio y puntos de tesoro.
- **Barra de objetivo**: de "Bestia salvaje" a "Mascota de sofá".
- **DragónGPT**: asistente que responde usando las fichas registradas. Es una IA de demostración que funciona en local, sin enviar datos.
- **4 categorías**: Modo hambre, Alertas de humo, Territorio y cueva, Tesoros y sobornos. Al tocarlas se filtra la lista.
- **Fichas de entrenamiento**: alta con categoría, descripción, instrucciones para la IA, intensidad (1-5 🔥) y fecha; eliminación con confirmación.
- **Facturas y gastos**: sube la foto de una factura (cámara o galería del iPhone), indica importe, concepto, fecha y categoría. Se contabilizan al momento: total, gasto del mes, número de facturas, importe medio y reparto por categoría. Toca una factura para ver la foto o eliminarla. **Exportar CSV** descarga el listado con el total (abre en Excel o Numbers). Las fotos se comprimen y se guardan en el navegador (IndexedDB).
- **Botón del pánico**: genera un protocolo de emergencia a partir de las fichas.
- **Restaurar dragón de ejemplo** desde el pie de página.

## Cómo ejecutarla

Abre `index.html` en el navegador, o sirve la carpeta con `python3 -m http.server 8000`.

## Estructura

```
index.html   # Maquetación y diálogos
styles.css   # Estilos (responsive, tema claro)
app.js       # Datos, indicadores, IA local y localStorage
```
