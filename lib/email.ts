/**
 * lib/email.ts — pengirim email generik via Resend REST API (native fetch,
 * tanpa dependensi). Tanpa RESEND_API_KEY → email dicatat ke log server
 * (mode "tanpa_key") sehingga alur tidak pernah melempar error.
 */

export type HasilKirim = "terkirim" | "tanpa_key" | "gagal";

/**
 * Kirim email transaksional sederhana.
 * @param to penerima tunggal
 * @param subjek subjek email
 * @param teks isi plain-text (fallback bila klien tak merender HTML)
 * @param html isi HTML opsional
 */
export async function kirimEmailResend(
  to: string,
  subjek: string,
  teks: string,
  html?: string,
): Promise<HasilKirim> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] tanpa RESEND_API_KEY — isi hanya dicatat. Kepada: ${to} — ${subjek}`);
    return "tanpa_key";
  }
  const dari = process.env.EMAIL_DARI ?? "info Marhaen <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: dari,
        to: [to],
        subject: subjek,
        text: teks,
        ...(html ? { html } : {}),
      }),
    });
    if (!res.ok) {
      const keterangan = await res.text().catch(() => "");
      console.error("[email] Resend menolak kirim:", res.status, keterangan.slice(0, 200));
      return "gagal";
    }
    return "terkirim";
  } catch (error) {
    console.error("[email] Error jaringan saat kirim:", error);
    return "gagal";
  }
}