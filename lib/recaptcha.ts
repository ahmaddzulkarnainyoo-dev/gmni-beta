/**
 * Verifikasi Google reCAPTCHA v3 di server (blueprint 8.3 & 14).
 * - Tanpa RECAPTCHA_SECRET_KEY (lingkungan dev) → komentar diizinkan agar
 *   pengembangan tidak terblokir; saat kunci disetel, skor harus ≥ 0.5.
 */

const SECRET = process.env.RECAPTCHA_SECRET_KEY ?? "";

/** Site key publik yang dipakai <script> reCAPTCHA di klien. */
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

/**
 * Cek token ke endpoint resmi Google. Mengembalikan false bila token kosong,
 * skor < 0.5, action tidak cocok, atau permintaan gagal.
 */
export async function verifikasiRecaptcha(
  token: string,
  action: string,
  ip?: string | null,
): Promise<boolean> {
  if (!token) return false;
  if (!SECRET) return process.env.NODE_ENV !== "production";

  try {
    const params = new URLSearchParams({ secret: SECRET, response: token });
    if (ip) params.set("remoteip", ip);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      cache: "no-store",
    });
    const data = (await res.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
    };

    if (!data.success) return false;
    if (typeof data.score === "number" && data.score < 0.5) return false;
    if (data.action && data.action !== action) return false;
    return true;
  } catch {
    return false;
  }
}
