const MAX_ATTEMPTS = 4; // 1 initial + 3 retries
const RETRY_DELAY_MS = 2000;

async function withRetry(fn, { shouldRetry = () => true } = {}) {
  let lastErr;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < MAX_ATTEMPTS - 1 && shouldRetry(err)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else if (!shouldRetry(err)) {
        break;
      }
    }
  }
  throw lastErr;
}

export async function fetchBuffer(url, userAgent) {
  return withRetry(async () => {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  });
}

export async function headContentLength(url, userAgent) {
  return withRetry(
    async () => {
      const res = await fetch(url, {
        method: "HEAD",
        headers: { "User-Agent": userAgent, "Accept-Encoding": "identity" },
      });
      if (!res.ok) {
        const err = new Error(`HEAD ${res.status} for ${url}`);
        err.httpStatus = res.status;
        throw err;
      }
      const cl = res.headers.get("content-length");
      return cl ? parseInt(cl, 10) : null;
    },
    { shouldRetry: (err) => err.httpStatus !== 404 },
  );
}
