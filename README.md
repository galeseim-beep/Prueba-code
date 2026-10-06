# Sales Pulse

Aplicación web ligera para controlar ventas: dashboard con indicadores, objetivo mensual de 50.000 €, tabla de últimas ventas, alta y eliminación de ventas. Todo en el navegador: sin backend, sin base de datos, sin dependencias.

## Cómo ejecutarla

Opción 1: abre `index.html` con doble clic en cualquier navegador moderno.

Opción 2: con un servidor estático local:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Funcionalidades

- **4 indicadores**: facturación total, número de ventas, ticket medio y % del objetivo alcanzado.
- **Objetivo mensual** de 50.000 € con barra de progreso (cuenta las ventas del mes en curso).
- **Tabla de últimas ventas** (cliente, producto, comercial, importe, fecha), ordenada por fecha. En móvil se muestra como tarjetas.
- **Nueva venta**: formulario con validación; los indicadores se actualizan al instante.
- **Eliminar venta** con confirmación.
- **5 ventas de ejemplo** cargadas la primera vez (fechadas en el mes actual).
- **Persistencia en `localStorage`**. El enlace "Restaurar datos de ejemplo" del pie vuelve al estado inicial.

## Estructura

```
index.html   # Maquetación
styles.css   # Estilos (responsive)
app.js       # Lógica, cálculo de indicadores y localStorage
```

El objetivo mensual se cambia en la constante `MONTHLY_GOAL` de `app.js`.
