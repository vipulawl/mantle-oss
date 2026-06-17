export async function apiFetch<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  const text = await res.text();
  if (!text) {
    console.error(`[fetch ${url}] empty response (HTTP ${res.status})`);
    return null;
  }
  try {
    const json = JSON.parse(text);
    if (!res.ok) {
      console.error(`[fetch ${url}] HTTP ${res.status}:`, json.error || json);
      return null;
    }
    return json as T;
  } catch (err) {
    console.error(`[fetch ${url}] failed to parse JSON:`, err, text.slice(0, 300));
    return null;
  }
}
