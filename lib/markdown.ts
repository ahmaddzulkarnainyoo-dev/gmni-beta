/**
 * Penerjemah Markdown minimal untuk editor artikel (tanpa dependensi).
 *
 * Kunci keamanan: input di-escape TAMPA HARI PERTAMA (anti-XSS), lalu
 * hanya menghasilkan elemen yang diizinkan: h1-h3, p, ul/ol/li,
 * blockquote, strong, em, code, a, hr, figure>img (markdown gambar),
 * figure>iframe (token :::youtube ID::: — ID divalidasi ketat).
 * Tidak ada HTML mentah yang lolos.
 * Untuk konten yang sepenuhnya HTML (contoh: konten seed resmi),
 * gunakan hanya pada konten tepercaya dari admin/redaksi.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(teks: string): string {
  return teks
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((\S+?)\)/g, (_m, teksTautan, url) => {
      const aman = String(url).replace(/^(javascript|data):/i, "#");
      return `<a href="${aman}" rel="nofollow noopener noreferrer" target="_blank">${teksTautan}</a>`;
    });
}

export function mdKeHtml(md: string): string {
  const baris = md.replace(/\r\n/g, "\n").split("\n");
  const hasil: string[] = [];
  let listAktif: "ul" | "ol" | null = null;
  const tutupList = () => {
    if (listAktif) {
      hasil.push(`</${listAktif}>`);
      listAktif = null;
    }
  };

  for (const mentah of baris) {
    const b = mentah.trim();
    if (b === "") {
      tutupList();
      continue;
    }

    // Gambar ber-kaption: ![caption](url) — satu baris penuh. URL hanya
    // http(s):// atau path internal "/" (anti javascript:/data: XSS).
    const cocokGambar = b.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (cocokGambar) {
      tutupList();
      const [, keterangan, urlMentah] = cocokGambar;
      if (/^(https?:\/\/|\/)/i.test(urlMentah)) {
        const keteranganHtml = keterangan
          ? `<figcaption>${inline(esc(keterangan))}</figcaption>`
          : "";
        hasil.push(
          `<figure class="konten-gambar"><img src="${esc(urlMentah)}" alt="${esc(keterangan)}" loading="lazy"/>${keteranganHtml}</figure>`,
        );
        continue;
      }
      // URL tidak sah → jatuh ke paragraf biasa (diescape penuh).
    }

    // Sisipan video YouTube: :::youtube <ID>::: — ID divalidasi ketat.
    const cocokVideo = b.match(/^:::youtube\s+([A-Za-z0-9_-]{6,20}):::$/);
    if (cocokVideo) {
      tutupList();
      hasil.push(
        `<figure class="konten-video"><iframe src="https://www.youtube-nocookie.com/embed/${cocokVideo[1]}" title="Video YouTube" loading="lazy" allowfullscreen></iframe><figcaption>Video: YouTube</figcaption></figure>`,
      );
      continue;
    }

    if (/^#{1,3}\s/.test(b)) {
      tutupList();
      const level = (b.match(/^#+/) ?? [""])[0].length;
      const teks = b.replace(/^#+\s+/, "");
      hasil.push(`<h${level}>${inline(esc(teks))}</h${level}>`);
    } else if (/^[-*]\s/.test(b)) {
      if (listAktif !== "ul") {
        tutupList();
        hasil.push("<ul>");
        listAktif = "ul";
      }
      hasil.push(`<li>${inline(esc(b.replace(/^[-*]\s+/, "")))}</li>`);
    } else if (/^\d+\.\s/.test(b)) {
      if (listAktif !== "ol") {
        tutupList();
        hasil.push("<ol>");
        listAktif = "ol";
      }
      hasil.push(`<li>${inline(esc(b.replace(/^\d+\.\s+/, "")))}</li>`);
    } else if (/^&gt;\s?/.test(b)) {
      tutupList();
      hasil.push(`<blockquote>${inline(esc(b.replace(/^&gt;\s?/, "")))}</blockquote>`);
    } else if (/^-{3,}$/.test(b)) {
      tutupList();
      hasil.push("<hr/>");
    } else {
      tutupList();
      hasil.push(`<p>${inline(esc(b))}</p>`);
    }
  }
  tutupList();
  return hasil.join("\n");
}

/**
 * Konversi balik HTML (yang dihasilkan mdKeHtml) menjadi Markdown editor.
 * Digunakan saat mengedit artikel: konten di DB berformat HTML, editor
 * menampilkannya kembali sebagai Markdown agar pengalaman menulis konsisten.
 */
export function htmlKeMd(html: string): string {
  return html
    // Sisipan media (blueprint editor): figure video & gambar → sintaks MD.
    .replace(
      /<figure class="konten-video"><iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{6,20})"[\s\S]*?<\/figure>/g,
      "\n:::youtube $1:::\n",
    )
    .replace(
      /<figure class="konten-gambar"><img src="([^"]*)" alt="([^"]*)"[^>]*\/?>[\s\S]*?<\/figure>/g,
      (_m, src: string, alt: string) =>
        `\n![${alt.replace(/&amp;/g, "&").replace(/&quot;/g, '"')}](${src.replace(/&amp;/g, "&")})\n`,
    )
    .replace(/<h1>/g, "\n# ")
    .replace(/<h2>/g, "\n## ")
    .replace(/<h3>/g, "\n### ")
    .replace(/<\/h[123]>/g, "\n")
    .replace(/<ul>/g, "")
    .replace(/<\/ul>/g, "\n")
    .replace(/<ol>/g, "")
    .replace(/<\/ol>/g, "\n")
    .replace(/<li>/g, "\n- ")
    .replace(/<\/li>/g, "")
    .replace(/<blockquote>/g, "\n> ")
    .replace(/<\/blockquote>/g, "\n")
    .replace(/<hr\s*\/?>/g, "\n---\n")
    .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
    .replace(/<em>(.*?)<\/em>/g, "_$1_")
    .replace(/<code>(.*?)<\/code>/g, "`$1`")
    .replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/g, "[$2]($1)")
    .replace(/<p>([\s\S]*?)<\/p>/g, "$1\n")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}