import assert from 'node:assert/strict';

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
};

const base = value('--base');
const local = args.includes('--local');
if (!base) throw new Error('Usage: node scripts/smoke.mjs --base <origin> [--local]');

const origin = new URL(base);
const isLocalhost = origin.hostname === 'localhost' || origin.hostname === '127.0.0.1';
if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && isLocalhost)) {
  throw new Error(`Expected an https origin (http is allowed for localhost only): ${base}`);
}
if (origin.pathname !== '/' || origin.search || origin.hash) throw new Error(`Expected an origin without a path: ${base}`);

// Used on preview deployments with protection on; never printed.
const bypass = process.env.VERCEL_PROTECTION_BYPASS;

async function request(path, { method = 'GET', expect = 200 } = {}) {
  const url = new URL(path, origin);
  const headers = bypass ? { 'x-vercel-protection-bypass': bypass } : {};
  const response = await fetch(url, { method, headers, signal: AbortSignal.timeout(90_000) });
  assert.equal(response.status, expect, `${method} ${path}: expected ${expect}, got ${response.status}`);
  return response;
}

let passed = 0;

async function check(name, run) {
  try {
    await run();
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(`     ${error.message}`);
    process.exit(1);
  }
  passed += 1;
  console.log(`ok ${name}`);
}

let firstId = null;

await check('/health answers 200 with JSON', async () => {
  const body = await (await request('/health')).json();
  assert.equal(body.status, 'ok');
});

await check('/v1/stations carries the BEE attribution', async () => {
  const body = await (await request('/v1/stations?limit=1')).json();
  assert.equal(body.success, true);
  assert.equal(body.data.length, 1);
  assert.ok(
    typeof body.meta.attribution === 'string' && body.meta.attribution.includes('Bureau of Energy Efficiency'),
    `meta.attribution is ${JSON.stringify(body.meta.attribution)}`
  );
  firstId = body.data[0].id;
});

await check('radius search returns one gun of at least 50 kW', async () => {
  const body = await (await request('/v1/stations/near?lat=12.9716&lng=77.5946&vehicle=car&current=dc&min_power_kw=50')).json();
  assert.ok(body.data.length >= 1, 'no station found around central Bengaluru');
  for (const station of body.data) {
    assert.ok(station.max_power_kw >= 50, `${station.id} has max_power_kw ${station.max_power_kw}`);
  }
});

await check('a station can be read by id', async () => {
  const body = await (await request(`/v1/stations/${firstId}`)).json();
  assert.equal(body.data.id, firstId);
});

await check('/v1/cities lists Karnataka cities', async () => {
  const body = await (await request('/v1/cities?state=KA')).json();
  assert.ok(body.data.length >= 1, 'no Karnataka city returned');
});

await check('an unknown route is a 404 envelope', async () => {
  const body = await (await request('/v1/nope', { expect: 404 })).json();
  assert.equal(body.success, false);
});

await check('a POST to a real route is a 405', async () => {
  await request('/v1/stations', { method: 'POST', expect: 405 });
});

if (!local) {
  await check('/docs serves HTML and an unknown page is a 404', async () => {
    const docs = await request('/docs');
    assert.match(docs.headers.get('content-type') || '', /text\/html/);
    await request('/this-page-does-not-exist', { expect: 404 });
  });

  await check('the function runs in Mumbai', async () => {
    const { headers } = await request('/health');
    const id = headers.get('x-vercel-id') || '';
    assert.match(id, /::bom1::/, `x-vercel-id is ${JSON.stringify(id)}`);
  });
}

console.log(`smoke ok (${passed} checks)`);
