import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Bantuan RBAC sisi server (blueprint Bagian 5):
 * - getSessionUser: mengambil pengguna sesi (nullable).
 * - requireAuthUser: memaksa sudah login; jika tidak, redirect ke /login.
 * - requirePermission: memaksa login + memiliki minimal satu dari kode
 *   permission yang diminta; jika tidak, redirect ke /login (belum login)
 *   atau / (tidak punya hak).
 */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  username?: string;
  roleId?: string;
  roleNama?: string;
  permissions: string[];
  twoFactorEnabled?: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const sess = await getServerSession(authOptions);
  const u = sess?.user;
  if (!u?.id) return null;
  return {
    id: u.id,
    name: u.name ?? "",
    email: u.email ?? "",
    username: u.username,
    roleId: u.roleId,
    roleNama: u.roleNama,
    permissions: u.permissions ?? [],
    twoFactorEnabled: u.twoFactorEnabled,
  };
}

/** Mengembalikan sesi hanya bila status, role, dan kebijakan 2FA masih sinkron. */
export async function getActiveSessionUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const rekaman = await prisma.user.findUnique({
    where: { id: user.id },
    select: { statusAkun: true, roleId: true, is2FAEnabled: true },
  });
  if (
    !rekaman ||
    rekaman.statusAkun !== "AKTIF" ||
    rekaman.roleId !== user.roleId ||
    typeof user.twoFactorEnabled !== "boolean" ||
    rekaman.is2FAEnabled !== user.twoFactorEnabled
  ) {
    return null;
  }
  return user;
}

export async function requireAuthUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Memastikan sesi masih berasal dari akun aktif sebelum aksi sensitif. */
export async function requireActiveUser(): Promise<SessionUser> {
  const user = await getActiveSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(...kode: string[]): Promise<SessionUser> {
  const user = await requireAuthUser();
  const punya = user.permissions.some((p) => kode.includes(p));
  if (!punya) redirect("/");
  return user;
}

/**
 * Memaksa login + role tertentu (berbasis nama role bawaan, blueprint 5.2).
 * Contoh: requireRole("Super Admin", "Editor") untuk area /admin.
 * - belum login        → redirect ke /login
 * - role tak diizinkan → redirect ke /
 */
export async function requireRole(...namaRole: string[]): Promise<SessionUser> {
  const user = await requireAuthUser();
  if (!user.roleNama || !namaRole.includes(user.roleNama)) redirect("/");
  return user;
}
