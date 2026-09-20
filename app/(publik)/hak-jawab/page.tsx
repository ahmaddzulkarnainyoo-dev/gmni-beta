import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HalamanStatisView } from "@/components/publik/HalamanStatisView";
import { FormHakJawab } from "@/components/publik/FormHakJawab";
import { ambilHalaman, deskripsiDariHalaman } from "@/lib/halaman";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const h = await ambilHalaman("hak-jawab");
  return {
    title: h?.judul ?? "Hak Jawab",
    description: h ? deskripsiDariHalaman(h) : undefined,
  };
}

export default async function HalamanHakJawab() {
  const h = await ambilHalaman("hak-jawab");
  if (!h) notFound();
  return (
    <>
      <HalamanStatisView judul={h.judul} konten={h.konten} />
      <div className="mx-auto max-w-3xl px-4 pb-12">
        <FormHakJawab />
      </div>
    </>
  );
}