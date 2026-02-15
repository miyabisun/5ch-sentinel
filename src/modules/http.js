export async function fetchBuffer(url, userAgent) {
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

export async function headContentLength(url, userAgent) {
  const res = await fetch(url, {
    method: "HEAD",
    headers: { "User-Agent": userAgent },
  });
  if (!res.ok) throw new Error(`HEAD ${res.status} for ${url}`);
  const cl = res.headers.get("content-length");
  return cl ? parseInt(cl, 10) : null;
}
