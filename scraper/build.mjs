// Actualiza precios desde lista.json: para cada producto, el nombre exacto que usa cada tienda.
// Uso: node build.mjs [lista.json] [salida.json]
import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36';
const get = async (url, headers = {}, tries = 3) => {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(45000) });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r;
  } catch (e) {
    if (tries <= 1) throw e;
    await new Promise((res) => setTimeout(res, 2000));
    return get(url, headers, tries - 1);
  }
};
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&amp;/g, '&').replace(/&quot;/g, '"');

const stores = {
  async LatinBien(q) { // Odoo: HTML de /shop
    const html = await (await get(`https://latinbien.com/shop?search=${encodeURIComponent(q)}`)).text();
    return html.split('tp-product-wrapper').slice(1).map((b) => {
      const m = b.match(/itemprop="name" title=(?:"([^"]*)"|'([^']*)')/);
      const price = b.match(/oe_currency_value">([\d.,]+)/)?.[1];
      const href = b.match(/href="(\/shop\/[^"#?]+)/)?.[1];
      return { nombre: decode((m && (m[1] ?? m[2])) || ''), precio: price ? +price.replace(/\./g, '').replace(',', '.') : 0, url: href && 'https://latinbien.com' + href };
    });
  },
  async Damasco(q) { // VTEX
    const j = await (await get(`https://www.damascovzla.com/api/catalog_system/pub/products/search?ft=${encodeURIComponent(q)}&_from=0&_to=19`)).json();
    return j.map((p) => ({ nombre: p.productName, precio: p.items[0]?.sellers[0]?.commertialOffer?.Price ?? 0, url: p.link }));
  },
  async IVOO(q) { // Magento GraphQL
    const query = `{products(search:${JSON.stringify(q)},pageSize:20){items{name url_key price_range{minimum_price{final_price{value}}}}}}`;
    const j = await (await get(`https://nuweapp.com/graphql?query=${encodeURIComponent(query)}`, { Store: 'default' })).json();
    return (j.data?.products?.items ?? []).map((p) => ({ nombre: p.name, precio: p.price_range.minimum_price.final_price.value, url: `https://www.ivoo.com/${p.url_key}.html` }));
  },
  MegaTecno: (q) => woo('https://megatecno.com.ve', q),
  Frigilux: (q) => woo('https://frigilux.com', q),
};
async function woo(base, q) { // WooCommerce Store API
  const j = await (await get(`${base}/wp-json/wc/store/v1/products?search=${encodeURIComponent(q)}&per_page=20`)).json();
  return j.map((p) => ({ nombre: decode(p.name), precio: +p.prices.price / 10 ** p.prices.currency_minor_unit, url: p.permalink }));
}

const lista = JSON.parse(fs.readFileSync(process.argv[2] || 'lista.json', 'utf8'));
const fecha = new Date().toISOString();
const filas = [];
for (const prod of lista) {
  for (const [tienda, { q, m, similar }] of Object.entries(prod.tiendas)) {
    try {
      const hit = (await stores[tienda](q)).filter((r) => r.precio > 0 && r.nombre.toLowerCase().includes(m.toLowerCase())).sort((a, b) => a.precio - b.precio)[0];
      if (!hit) { console.log(`  sin resultado: ${prod.producto} @ ${tienda}`); continue; }
      filas.push({ producto: prod.producto, categoria: prod.categoria, tienda, precio: hit.precio, encontrado: hit.nombre, coincidencia: similar ? 'similar' : 'exacta', url: hit.url, fecha });
      console.log(`${prod.producto.padEnd(42)} ${tienda.padEnd(10)} $${hit.precio}  <- ${hit.nombre}`);
    } catch (e) {
      console.log(`  error: ${prod.producto} @ ${tienda}: ${e.message}`);
    }
  }
}
fs.writeFileSync(process.argv[3] || 'precios.json', JSON.stringify(filas, null, 1));
