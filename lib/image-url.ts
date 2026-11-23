/** URL gambar yang aman untuk disimpan sebagai gambar utama artikel. */
export function urlGambarValid(value: string): boolean {
  const url = value.trim();
  if (!url || url.length > 2000) return false;
  if (url.startsWith("/")) return !url.startsWith("//");
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
