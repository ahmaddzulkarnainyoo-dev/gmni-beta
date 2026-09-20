"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

type PenggunaData = {
  id: string;
  namaLengkap: string;
  email: string;
  nim: string | null;
  username: string;
  statusAkun: "AKTIF" | "PENDING" | "SUSPEND";
  roleId: string;
  roleNama: string;
  tokenUndangan: string | null;
  diundangOlehEmail: string | null;
  cabangKomisariat: string | null;
  cabangDpc: string | null;
  komisariat: string | null;
  tanggalBergabung: string | null;
};

type RoleOpsi = { id: string; nama: string };

/** Kelola kader: ubah peran, tangguhkan/aktifkan, hapus permanen. */
export function PanelPengguna({
  pengguna,
  roles,
  bisaSuspend,
  bisaHapus,
  bisaUbahRole,
}: {
  pengguna: PenggunaData[];
  roles: RoleOpsi[];
  bisaSuspend: boolean;
  bisaHapus: boolean;
  bisaUbahRole: boolean;
}) {
  const router = useRouter();
  const [memuat, setMemuat] = useState<Record<string, string>>({});
  const [eror, setEror] = useState<Record<string, string>>({});
  const [sukses, setSukses] = useState<string | null>(null);
  const [tautanPemulihan, setTautanPemulihan] = useState<
    Record<string, string | null>
  >({});

  async function gantiPeran(u: PenggunaData, roleId: string) {
    const roleBaru = roles.find((r) => r.id === roleId);
    if (!roleBaru || roleBaru.id === u.roleId) return;
    if (
      !window.confirm(
        `Ubah peran ${u.namaLengkap} dari ${u.roleNama} menjadi ${roleBaru.nama}? Berlaku saat kader login berikutnya.`,
      )
    ) {
      return;
    }
    setMemuat((m) => ({ ...m, [u.id]: "peran" }));
    setEror((e) => ({ ...e, [u.id]: "" }));
    try {
      const res = await fetch(`/api/admin/pengguna/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEror((e) => ({ ...e, [u.id]: data.error ?? "Gagal mengubah peran." }));
        return;
      }
      setSukses(`Peran ${u.namaLengkap} diubah — berlaku saat kader login berikutnya.`);
      router.refresh();
    } catch {
      setEror((e) => ({ ...e, [u.id]: "Tidak dapat menghubungi server." }));
    } finally {
      setMemuat((m) => ({ ...m, [u.id]: "" }));
    }
  }

  async function gantiStatus(u: PenggunaData) {
    setMemuat((m) => ({ ...m, [u.id]: "suspend" }));
    setEror((e) => ({ ...e, [u.id]: "" }));
    try {
      const res = await fetch(`/api/admin/pengguna/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusAkun: u.statusAkun === "AKTIF" ? "SUSPEND" : "AKTIF" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEror((e) => ({ ...e, [u.id]: data.error ?? "Gagal mengubah status." }));
        return;
      }
      setSukses(`Status ${u.namaLengkap} diperbarui.`);
      router.refresh();
    } catch {
      setEror((e) => ({ ...e, [u.id]: "Tidak dapat menghubungi server." }));
    } finally {
      setMemuat((m) => ({ ...m, [u.id]: "" }));
    }
  }

  async function hapusAkun(u: PenggunaData) {
    if (
      !window.confirm(
        `Hapus akun ${u.namaLengkap} (@${u.username}) secara permanen? Aksi ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }
    setMemuat((m) => ({ ...m, [u.id]: "hapus" }));
    setEror((e) => ({ ...e, [u.id]: "" }));
    try {
      const res = await fetch(`/api/admin/pengguna/${u.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEror((e) => ({ ...e, [u.id]: data.error ?? "Gagal menghapus akun." }));
        return;
      }
      setSukses(`Akun ${u.namaLengkap} dihapus permanen.`);
      router.refresh();
    } catch {
      setEror((e) => ({ ...e, [u.id]: "Tidak dapat menghubungi server." }));
    } finally {
      setMemuat((m) => ({ ...m, [u.id]: "" }));
    }
  }

  /** Pintu darurat lupa sandi tanpa email: buat tautan sekali-pakai 24 jam. */
  async function buatTautanPemulihan(u: PenggunaData) {
    if (
      !window.confirm(
        `Buat tautan pemulihan sandi untuk ${u.namaLengkap} (@${u.username})? Tautan berlaku 24 jam dan hanya bisa dipakai sekali. Bagikan langsung ke kader.`,
      )
    ) {
      return;
    }
    setMemuat((m) => ({ ...m, [u.id]: "pemulihan" }));
    setEror((e) => ({ ...e, [u.id]: "" }));
    setTautanPemulihan((t) => ({ ...t, [u.id]: null }));
    try {
      const res = await fetch(`/api/admin/pengguna/${u.id}/reset-sandi`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string; tautan?: string };
      if (!res.ok || !data.tautan) {
        setEror((e) => ({
          ...e,
          [u.id]: data.error ?? "Gagal membuat tautan pemulihan.",
        }));
        return;
      }
      setTautanPemulihan((t) => ({ ...t, [u.id]: data.tautan ?? null }));
    } catch {
      setEror((e) => ({ ...e, [u.id]: "Tidak dapat menghubungi server." }));
    } finally {
      setMemuat((m) => ({ ...m, [u.id]: "" }));
    }
  }

  async function salinTautan(tautan: string) {
    try {
      await navigator.clipboard.writeText(tautan);
    } catch {
      // Clipboard ditolak browser — admin masih bisa menyalin manual dari input.
    }
  }

  if (pengguna.length === 0) {
    return (
      <div className="mt-6 border-4 border-dashed border-hitam-200 bg-kertas-100 p-10 text-center">
        <p className="font-serif text-xl font-bold text-hitam-900">Belum ada kader.</p>
      </div>
    );
  }

  return (
    <div>
      {sukses && (
        <p
          role="status"
          className="mt-6 border-2 border-hitam-900 bg-kertas-100 px-4 py-3 text-sm font-semibold text-hitam-800"
        >
          ✓ {sukses}
        </p>
      )}
      <ul className="mt-6 space-y-4">
      {pengguna.map((u) => (
        <li key={u.id} className="border border-hitam-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${
                    u.statusAkun === "AKTIF"
                      ? "border-hitam-900 bg-kertas-200 text-hitam-700"
                      : u.statusAkun === "PENDING"
                        ? "border-hitam-900 bg-hitam-900 text-white"
                        : "border-gmnimerah-700 bg-gmnimerah-50 text-gmnimerah-700"
                  }`}
                >
                  {u.statusAkun === "AKTIF"
                    ? "Aktif"
                    : u.statusAkun === "PENDING"
                      ? "Menunggu Verifikasi"
                      : "Ditangguhkan"}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-hitam-400">
                  {u.roleNama}
                </span>
                {bisaUbahRole && u.roleNama !== "Super Admin" && (
                  <label className="mt-1 block">
                    <span className="sr-only">Ubah peran {u.namaLengkap}</span>
                    <select
                      value={u.roleId}
                      disabled={!!memuat[u.id]}
                      onChange={(e) => gantiPeran(u, e.target.value)}
                      className="mt-1 max-w-[220px] border border-hitam-900 bg-white px-2 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-hitam-900 disabled:opacity-50"
                    >
                      {roles.every((r) => r.id !== u.roleId) && (
                        <option value={u.roleId}>{u.roleNama} (saat ini)</option>
                      )}
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nama}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <p className="mt-2 font-serif text-lg font-bold text-hitam-900">
                {u.namaLengkap}
              </p>
              <p className="text-sm text-hitam-500">
                {u.email} · @{u.username}
              </p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-hitam-500">
                NIM {u.nim ?? "—"}
              </p>
              {(u.cabangDpc || u.komisariat || u.cabangKomisariat) && (
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-hitam-400">
                  {[u.cabangDpc, u.komisariat ?? u.cabangKomisariat]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {u.diundangOlehEmail && (
                <p className="font-mono text-[11px] uppercase tracking-wider text-hitam-400">
                  Diundang oleh {u.diundangOlehEmail}
                </p>
              )}
              {eror[u.id] && (
                <p role="alert" className="mt-2 text-sm font-semibold text-gmnimerah-700">
                  {eror[u.id]}
                </p>
              )}
              {tautanPemulihan[u.id] && (
                <div className="mt-2 border-2 border-hitam-900 bg-kertas-100 p-2">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">
                    Tautan pemulihan (24 jam, sekali pakai):
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={tautanPemulihan[u.id] ?? ""}
                      onFocus={(e) => e.currentTarget.select()}
                      className="min-w-0 flex-1 border border-hitam-200 bg-white px-2 py-1 font-mono text-[11px] text-hitam-900"
                    />
                    <button
                      type="button"
                      onClick={() => salinTautan(tautanPemulihan[u.id] ?? "")}
                      className="border border-hitam-900 bg-hitam-900 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white hover:bg-gmnimerah-600"
                    >
                      Salin
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {bisaSuspend && (u.statusAkun === "AKTIF" || u.statusAkun === "SUSPEND") && (
                <button
                  type="button"
                  disabled={!!memuat[u.id]}
                  onClick={() => {
                    const tangguhkan = u.statusAkun === "AKTIF";
                    if (
                      !window.confirm(
                        tangguhkan
                          ? `Tangguhkan akun ${u.namaLengkap}? Kader tidak dapat masuk selama ditangguhkan.`
                          : `Pulihkan akun ${u.namaLengkap}? Kader dapat masuk kembali lewat NIM.`,
                      )
                    ) {
                      return;
                    }
                    gantiStatus(u);
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-hitam-900 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {memuat[u.id] === "suspend" && <Spinner className="h-3.5 w-3.5" />}
                  {memuat[u.id] === "suspend"
                    ? "Memproses..."
                    : u.statusAkun === "AKTIF"
                      ? "Tangguhkan"
                      : "Pulihkan"}
                </button>
              )}
              {bisaSuspend && (
                <button
                  type="button"
                  disabled={!!memuat[u.id]}
                  onClick={() => buatTautanPemulihan(u)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-hitam-900 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {memuat[u.id] === "pemulihan" && <Spinner className="h-3.5 w-3.5" />}
                  {memuat[u.id] === "pemulihan"
                    ? "Membuat..."
                    : "Reset Sandi"}
                </button>
              )}
              {bisaSuspend && (
                <button
                  type="button"
                  disabled={!!memuat[u.id]}
                  onClick={() => hapusAkun(u)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-hitam-900 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-gmnimerah-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {memuat[u.id] === "hapus" && <Spinner className="h-3.5 w-3.5" />}
                  {memuat[u.id] === "hapus" ? "Menghapus..." : "Hapus"}
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
      </ul>
    </div>
  );
}