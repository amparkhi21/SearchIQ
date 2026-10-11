// Audits image identity and consistency. `--db` and `--opensearch` inspect live stores;
// `--network` checks reachable URLs only and never treats reachability as image verification.
import { buildCatalog } from '../src/seed/data/catalog.builder.js';
import { loadImageAssignments, loadImageRecords } from '../src/seed/data/imageManifest.js';

const useNetwork = process.argv.includes('--network');
const useDb = process.argv.includes('--db');
const useOpenSearch = process.argv.includes('--opensearch');
const useCatalogApi = process.argv.includes('--catalog-api');
const problems = [];
const problem = (text) => problems.push(text);
const normalizedUrl = (value) => {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
};
const catalog = buildCatalog();
const assignments = loadImageAssignments();
const records = loadImageRecords();
let liveProducts = [];
if (useCatalogApi) {
  const baseUrl = process.env.SEARCHIQ_CATALOG_API_URL || 'http://127.0.0.1:5000/api/v1/products';
  for (let page = 1; ; page += 1) {
    const url = new URL(baseUrl);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', '100');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Catalog API returned HTTP ${response.status} for page ${page}`);
    const payload = await response.json();
    const rows = payload?.data?.products;
    if (!Array.isArray(rows)) throw new Error('Catalog API response did not contain data.products');
    liveProducts.push(...rows);
    if (liveProducts.length >= Number(payload?.meta?.total ?? liveProducts.length)) break;
    if (!rows.length) throw new Error('Catalog API pagination ended before all products were read');
  }
}
const auditProducts = useCatalogApi ? liveProducts : catalog.products.map((product) => ({
  id: 'not-in-offline-seed', sku: product.sku, name: product.name,
  brand: { name: product.brandName }, category: { name: product.categoryName },
  images: product.images,
}));
const catalogBySku = new Map(auditProducts.map((product) => [product.sku, product]));
const candidateOwners = new Map();

for (const [sku, entry] of records) {
  const product = catalogBySku.get(sku);
  if (!product) problem(`image record SKU is not in the current catalog: ${sku}`);
  if (entry.sku && entry.sku !== sku) problem(`image record key/SKU mismatch: key=${sku}, entry=${entry.sku}`);
  if (product && entry.name && entry.name !== product.name) {
    problem(`image record name mismatch for ${sku}: recorded="${entry.name}", catalog="${product.name}"`);
  }
  if (entry.url) {
    const key = normalizedUrl(entry.url);
    if (!candidateOwners.has(key)) candidateOwners.set(key, []);
    candidateOwners.get(key).push(sku);
  }
}
for (const [url, skus] of candidateOwners) {
  if (url && skus.length > 1) problem(`candidate image URL is shared by SKUs ${skus.join(', ')}: ${url}`);
}

const byCategory = new Map();
const auditedOwners = new Map();
let verifiedCount = 0;
let unverifiedCount = 0;
let missingCount = 0;
for (const product of auditProducts) {
  const assignment = assignments.get(product.sku);
  const categoryName = product.category?.name ?? product.categoryName ?? 'unknown';
  const row = byCategory.get(categoryName) ?? { total: 0, verified: 0 };
  row.total += 1;
  const actualUrl = product.images?.[0]?.url ?? '';
  const matches = Boolean(assignment?.verified && assignment.name === product.name && normalizedUrl(actualUrl) === normalizedUrl(assignment.image.url));
  const status = matches ? 'verified' : actualUrl ? 'unverified' : 'missing/fallback';
  if (matches) { row.verified += 1; verifiedCount += 1; }
  else if (actualUrl) unverifiedCount += 1;
  else missingCount += 1;
  if (actualUrl) {
    const key = normalizedUrl(actualUrl);
    if (!auditedOwners.has(key)) auditedOwners.set(key, []);
    auditedOwners.get(key).push(`${product.id ?? 'no-id'}/${product.sku}`);
  }
  byCategory.set(categoryName, row);
  const record = records.get(product.sku);
  const brandName = product.brand?.name ?? product.brandName ?? '';
  console.log(`CATALOG | id=${product.id ?? 'not-in-offline-seed'} | sku=${product.sku} | brand=${JSON.stringify(brandName)} | name=${JSON.stringify(product.name)} | category=${JSON.stringify(categoryName)} | status=${status} | image=${JSON.stringify(actualUrl || assignment?.image.url || record?.url || null)}`);
  if (status !== 'verified') problem(`${status}: ${product.sku} ${brandName} ${product.name}`);
}
for (const [url, owners] of auditedOwners) if (url && owners.length > 1) problem(`actual catalog image URL is shared by ${owners.join(', ')}: ${url}`);

console.log(`\n${useCatalogApi ? 'Live catalog' : 'Seed catalog'}: ${auditProducts.length} products; ${verifiedCount} verified; ${unverifiedCount} unverified; ${missingCount} missing/fallback; ${assignments.size} verified exact manifest mappings`);
console.log('Verified coverage by category:', [...byCategory.entries()]
  .map(([name, row]) => `${name} ${row.verified}/${row.total}`).join(' | '));
console.log(`Unverified legacy image records: ${[...records.values()].filter((entry) => entry.verified !== true).length}`);

if (useDb) {
  const { connectMongo, disconnectMongo } = await import('../src/config/db.js');
  const { default: Product } = await import('../src/models/Product.js');
  try {
    await connectMongo();
    const products = await Product.find({ isActive: true })
      .select('_id sku name brand category images')
      .populate('brand', 'name')
      .populate('category', 'name slug')
      .lean();
    const owners = new Map();
    let verified = 0;
    let missing = 0;
    let unverified = 0;
    let mismatches = 0;
    for (const product of products) {
      const assignment = assignments.get(product.sku);
      const expectedName = assignment?.name === product.name;
      const first = product.images?.[0]?.url;
      const matches = Boolean(assignment?.verified && expectedName && normalizedUrl(first ?? '') === normalizedUrl(assignment.image.url));
      const status = matches ? 'verified' : first ? 'unverified' : 'missing/fallback';
      if (matches) verified += 1;
      else if (first) unverified += 1;
      else missing += 1;
      if (assignment?.verified && expectedName && !matches) {
        mismatches += 1;
        problem(`MongoDB differs from verified mapping: id=${product._id} sku=${product.sku} name=${product.name}`);
      }
      for (const image of product.images ?? []) {
        const key = normalizedUrl(image.url);
        if (!key) { problem(`malformed MongoDB image: id=${product._id} sku=${product.sku}`); continue; }
        if (!owners.has(key)) owners.set(key, []);
        owners.get(key).push(`${product._id}/${product.sku}`);
      }
      console.log(`MONGODB | id=${product._id} | sku=${product.sku} | brand=${JSON.stringify(product.brand?.name ?? '')} | name=${JSON.stringify(product.name)} | status=${status} | image=${JSON.stringify(first ?? null)}`);
    }
    const duplicateUrls = [...owners.values()].filter((productsForUrl) => productsForUrl.length > 1);
    duplicateUrls.forEach((items) => problem(`MongoDB image shared by ${items.join(', ')}`));
    console.log(`MongoDB: ${products.length} active products; ${verified} verified; ${unverified} unverified; ${missing} missing/fallback; ${duplicateUrls.length} shared-image groups; ${mismatches} verified-map mismatches`);
  } finally {
    await disconnectMongo();
  }
}

if (useOpenSearch) {
  const { connectOpenSearch, disconnectOpenSearch, getOpenSearchClient } = await import('../src/config/opensearch.js');
  const { PRODUCT_INDEX } = await import('../src/services/indexing.service.js');
  let disconnectMongo;
  let connectMongo;
  let mongoProducts = [];
  if (useDb) {
    ({ connectMongo, disconnectMongo } = await import('../src/config/db.js'));
    const { default: Product } = await import('../src/models/Product.js');
    await connectMongo();
    mongoProducts = await Product.find({ isActive: true }).select('_id sku name images').lean();
  } else if (useCatalogApi) {
    mongoProducts = liveProducts.map((product) => ({ _id: product.id, sku: product.sku, name: product.name, images: product.images }));
  }
  await connectOpenSearch();
  try {
    const client = getOpenSearchClient();
    const response = await client.search({
      index: PRODUCT_INDEX,
      body: { size: 10000, query: { match_all: {} }, _source: ['productId', 'sku', 'name', 'images'] },
    });
    const body = response?.body ?? response;
    const docs = body?.hits?.hits ?? [];
    const bySku = new Map();
    const byProductId = new Map();
    const imageOwners = new Map();
    let missing = 0;
    let unverified = 0;
    let mismatches = 0;
    for (const hit of docs) {
      const product = hit._source ?? {};
      const assignment = assignments.get(product.sku);
      const url = product.images?.[0]?.url;
      if (!product.productId || !product.sku) problem(`OpenSearch document has no canonical productId/SKU: doc=${hit._id}`);
      if (!url) missing += 1;
      else if (!assignment?.verified || normalizedUrl(url) !== normalizedUrl(assignment.image.url)) unverified += 1;
      if (url) {
        const key = normalizedUrl(url);
        if (!imageOwners.has(key)) imageOwners.set(key, new Set());
        imageOwners.get(key).add(product.sku ?? hit._id);
      }
      if (assignment?.verified && normalizedUrl(url ?? '') !== normalizedUrl(assignment.image.url)) mismatches += 1;
      if (product.sku) {
        if (!bySku.has(product.sku)) bySku.set(product.sku, []);
        bySku.get(product.sku).push(hit);
      }
      if (product.productId) {
        if (!byProductId.has(product.productId)) byProductId.set(product.productId, []);
        byProductId.get(product.productId).push(hit);
      }
      console.log(`OPENSEARCH | doc=${hit._id} | productId=${product.productId ?? ''} | sku=${product.sku ?? ''} | name=${JSON.stringify(product.name ?? '')} | status=${url ? (assignment?.verified ? 'verified-candidate' : 'unverified') : 'missing/fallback'} | image=${JSON.stringify(url ?? null)}`);
    }
    for (const [sku, duplicates] of bySku) {
      if (duplicates.length > 1) {
        problem(`duplicate OpenSearch documents for SKU ${sku}: ${duplicates.map((hit) => `${hit._id}(productId=${hit._source?.productId})`).join(', ')}`);
      }
    }
    for (const [id, duplicates] of byProductId) {
      if (duplicates.length > 1) {
        problem(`duplicate OpenSearch documents for productId ${id}: ${duplicates.map((hit) => hit._id).join(', ')}`);
      }
    }
    for (const [url, owners] of imageOwners) {
      if (owners.size > 1) problem(`OpenSearch image reused across SKUs ${[...owners].join(', ')}: ${url}`);
    }
    for (const product of mongoProducts) {
      const indexed = bySku.get(product.sku) ?? [];
      const canonical = indexed.find((hit) => String(hit._id) === String(product._id)) ?? indexed[0];
      if (!canonical) problem(`OpenSearch document missing MongoDB product ${product._id}/${product.sku}`);
      else if (normalizedUrl(product.images?.[0]?.url ?? '') !== normalizedUrl(canonical._source?.images?.[0]?.url ?? '')) {
        problem(`MongoDB/OpenSearch image mismatch for ${product._id}/${product.sku}`);
      }
    }
    console.log(`OpenSearch: ${docs.length} documents; ${bySku.size} unique SKUs; ${missing} missing image fields; ${unverified} unverified image assignments; ${mismatches} verified-map mismatches`);
  } finally {
    await disconnectOpenSearch();
    if (disconnectMongo) await disconnectMongo();
  }
}

if (useNetwork) {
  const urls = [...assignments.values()].map(({ image }) => image.url);
  console.log(`\nChecking ${urls.length} verified image URLs for reachability (reachability does not verify identity)...`);
  let reachable = 0;
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
      if (response.ok && (response.headers.get('content-type') || '').startsWith('image/')) reachable += 1;
      else problem(`verified image URL is unreachable or not image content: ${response.status} ${url}`);
    } catch (error) {
      problem(`verified image URL network check failed (${error.message}): ${url}`);
    }
  }
  console.log(`Reachable verified image URLs: ${reachable}/${urls.length}`);
}

console.log(`\nAudit findings: ${problems.length}`);
if (problems.length) {
  problems.slice(0, 100).forEach((text) => console.log(`  PROBLEM  ${text}`));
  process.exitCode = 1;
} else {
  console.log('No image identity, duplicate, or consistency issues found.');
}
