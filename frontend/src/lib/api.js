/**
 * Thin JSON client for this API. Turns the standard error envelope into a typed
 * ApiError so components can render a useful message, and honours Retry-After on
 * 429 responses instead of leaving the user to guess.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'ERROR', details = null, retryAfterSeconds = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  get isRateLimited() {
    return this.status === 429 || this.code === 'RATE_LIMIT_EXCEEDED';
  }

  get isValidation() {
    return this.status === 400;
  }
}

export async function apiGet(path, { signal } = {}) {
  let response;
  try {
    response = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Could not reach the API. Check your connection and try again.', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const envelope = body && body.error ? body.error : null;
    const retryAfter = Number(response.headers.get('retry-after'));
    throw new ApiError(
      envelope && envelope.message
        ? envelope.message
        : `Request failed with status ${response.status}.`,
      {
        status: response.status,
        code: envelope && envelope.code ? envelope.code : 'HTTP_ERROR',
        details: envelope ? envelope.details : null,
        retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
      }
    );
  }

  return body;
}

/** Builds a /v1/stations/near query string from a parameter object. */
export function buildNearQuery({ lat, lng, radiusKm, limit = 25, connector, minPowerKw }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radiusKm),
    limit: String(limit),
  });
  if (connector) params.set('connector', connector);
  if (minPowerKw) params.set('min_power_kw', String(minPowerKw));
  return `/v1/stations/near?${params.toString()}`;
}
