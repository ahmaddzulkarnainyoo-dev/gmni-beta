import type { Metadata } from "next";
import { requireAuthUser } from "@/lib/session";
import { PanelKasKader } from "@/components/dasbor/PanelKasKader";

export const metadata: Metadata = { title: "Iuran Kas" };
export const dynamic = "force-dynamic";

export default async function HalamanKasKader() {
  await requireAuthUser();
  return <PanelKasKader />;
}
