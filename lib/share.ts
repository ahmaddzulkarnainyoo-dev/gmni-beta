export type ShareContent = {
  title: string;
  text?: string;
  url: string;
  file?: File;
};

export const platformShareLinks = ({ title, url }: Pick<ShareContent, "title" | "url">) => {
  const teks = `${title} — ${url}`;
  return [
    { nama: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(teks)}` },
    { nama: "X", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
    { nama: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { nama: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { nama: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
    { nama: "Email", href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(teks)}` },
  ];
};

export async function salinTeks(teks: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(teks);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = teks;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const berhasil = document.execCommand("copy");
    textarea.remove();
    return berhasil;
  } catch {
    return false;
  }
}

export async function bagikanNative({ title, text, url, file }: ShareContent): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  try {
    if (file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      await navigator.share({ title, text, url, files: [file] });
    } else {
      await navigator.share({ title, text, url });
    }
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return false;
    return false;
  }
}

export function blobMenjadiFile(blob: Blob, nama = "kartu-kutipan.png"): File {
  return new File([blob], nama, { type: blob.type || "image/png" });
}
