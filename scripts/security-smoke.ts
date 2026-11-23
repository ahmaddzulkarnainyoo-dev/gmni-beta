import assert from "node:assert/strict";
import { bylineArtikel } from "../lib/articles";
import { mdKeHtml } from "../lib/markdown";

const payloads = [
  "<script>alert(1)</script>",
  "[tautan](javascript:alert(1))",
  "[tautan](data:text/html,x)",
  "[tautan](//evil.example)",
  "![gambar](javascript:alert(1))",
  ":::youtube <script>:::",
];

for (const payload of payloads) {
  const html = mdKeHtml(payload);
  assert.equal(html.includes("<script"), false, `script lolos: ${payload}`);
  assert.equal(html.includes("javascript:"), false, `javascript URL lolos: ${payload}`);
  assert.equal(html.includes("data:"), false, `data URL lolos: ${payload}`);
  assert.equal(html.includes('src="//evil.example'), false, `URL protocol-relative lolos: ${payload}`);
}

const byline = bylineArtikel({
  visibilitasPenulis: "SAMARAN",
  namaTampilanKustom: "Bung Merdeka",
  penulis: { namaLengkap: "Nama Asli", username: "namaasli" },
});
assert.deepEqual(byline, { nama: "Bung Merdeka", href: undefined });

console.log("Security smoke test passed.");
