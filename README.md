# Análisis de precios Mérida

Comparativo de precios de LatinBien contra otras tiendas de Venezuela.

**Ver la página:** https://latinbienti-sys.github.io/analisisprecios/

## Cómo funciona

- `scraper/lista.json`: los productos a comparar. Para cada tienda dice qué buscar (`q`) y qué texto debe aparecer en el nombre del producto (`m`), para no confundir modelos. Agrega `"similar": true` cuando el modelo no es idéntico.
- `scraper/build.mjs`: consulta cada tienda y escribe `data/precios.json`.
- `data/tiendas.json`: qué tiendas se pueden consultar y cómo.
- `.github/workflows/actualizar-precios.yml`: corre el script todos los días y guarda los precios nuevos.

## Tiendas

| Tienda | Cómo se consulta |
|---|---|
| LatinBien | Búsqueda de la tienda (Odoo) |
| Damasco | Catálogo público de damascovzla.com (VTEX) |
| IVOO | Catálogo público de ivoo.com (Magento) |
| MegaTecno | Catálogo público (WooCommerce) |
| Frigilux | Catálogo público (WooCommerce); bloquea si se consulta muy seguido |
| SoyTechno, Multimax | Bloqueadas por Cloudflare: no se consultan |

## Actualizar a mano

```
node scraper/build.mjs scraper/lista.json data/precios.json
```

Necesita Node 18 o más reciente.
