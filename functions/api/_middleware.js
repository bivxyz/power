// Every route under /api passes through here, so the passphrase is enforced in one
// place. A second endpoint carrying its own copy of this check is how one of them
// ends up unprotected.

const KEY_HEADER = 'x-power-key';

const sha256 = value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

// Hashing both sides first means the comparison is over two fixed-length buffers,
// so a wrong passphrase cannot be narrowed down by how long the check takes.
async function authenticated(request, env) {
  const expected = env.SYNC_SECRET;
  if (!expected) {
    // No secret configured. Allow local development, never a deployed origin.
    const host = new URL(request.url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }
  const presented = request.headers.get(KEY_HEADER);
  if (!presented) return false;
  const [a, b] = await Promise.all([sha256(presented), sha256(expected)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

export async function onRequest(context) {
  const {request, env, next} = context;
  if (request.method === 'OPTIONS') return next();
  if (await authenticated(request, env)) return next();
  const presented = request.headers.get(KEY_HEADER);
  return new Response(JSON.stringify({
    error: presented ? 'That passphrase is not right.' : 'A sync passphrase is required.',
    code: presented ? 'key_rejected' : 'key_required'
  }), {
    status: 401,
    headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}
  });
}
