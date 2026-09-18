import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  normalisasiKodePemulihan,
  verifikasiTotp,
} from "@/lib/totp";

/**
 * Konfigurasi NextAuth/Auth.js info Marhaen.
 *
 * Strategi: Credentials (email + sandi [+ OTP 2FA]) + sesi JWT. Pengguna
 * divalidasi langsung terhadap tabel User (Prisma), sandi dicek dengan
 * bcryptjs. Informasi role + permission disematkan ke token JWT agar RBAC
 * (blueprint Bagian 5) bisa dijalankan di server tanpa query DB berulang.
 *
 * 2FA TOTP (Sub-Fase 4.2, kebijakan opsional): bila `is2FAEnabled` true,
 * `authorize` melempar Error("OTP_REQUIRED") saat kode belum disertakan,
 * Error("OTP_INVALID") saat kode salah, dan Error("OTP_TERKUNCI") saat
 * akun dikunci sementara akibat 5x gagal beruntun (15 menit). Melempar
 * Error (bukan return null) agar pesan spesifik sampai ke client —
 * klien NextAuth memakai `error.message` sebagai kode error redirect.
 */

// Batas brute-force OTP: 5x gagal → kunci 15 menit.
const BATAS_GAGAL_OTP = 5;
const DURASI_KUNCI_MS = 15 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret:
    process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "info-marhaen-dev-secret",
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production" &&
        (process.env.NEXTAUTH_URL?.startsWith("https://") ?? true)
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/keluar",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Kredensial Kader",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Sandi", type: "password" },
        otpToken: { label: "Kode 2FA", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const sandi = credentials?.password;
        if (!email || !sandi) return null;

        // === SEKAT INFRA vs KREDENSIAL ================================
        // Gagal koneksi DB (Supabase pooler timeout dll.) TIDAK boleh
        // tersamar sebagai "kredensial salah": lempar kode AUTH_SERVER
        // (log server berisi penyebab asli), client menampilkan pesan
        // khusus. Kredensial salah tetap return null (CredentialsSignin).
        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email },
            include: {
              role: { include: { permissions: { include: { permission: true } } } },
            },
          });
          if (!user) {
            // Fallback case-insensitive — email tersimpan dengan kapital berbeda.
            user = await prisma.user.findFirst({
              where: { email: { equals: email, mode: "insensitive" } },
              include: {
                role: { include: { permissions: { include: { permission: true } } } },
              },
            });
          }
        } catch (e) {
          console.error(
            `[auth] DB tidak terjangkau saat memeriksa ${email}:`,
            e instanceof Error ? e.message : e,
          );
          throw new Error("AUTH_SERVER");
        }
        if (!user || user.statusAkun !== "AKTIF") {
          console.warn(
            `[auth] kredensial ditolak (${email}): ${
              !user ? "akun tidak ditemukan" : `status ${user.statusAkun}`
            }`,
          );
          return null;
        }

        let cocok: boolean;
        try {
          cocok = await compare(sandi, user.passwordHash);
        } catch (e) {
          console.error(
            "[auth] gagal memverifikasi hash sandi:",
            e instanceof Error ? e.message : e,
          );
          throw new Error("AUTH_SERVER");
        }
        if (!cocok) return null;

        // Gate 2FA: hanya untuk akun yang mengaktifkannya (opsional).
        if (user.is2FAEnabled && user.totpSecret) {
          if (user.totpKunciSampai && user.totpKunciSampai > new Date()) {
            throw new Error("OTP_TERKUNCI");
          }
          const otp = (credentials?.otpToken ?? "").replace(/[\s-]/g, "");
          if (!otp) throw new Error("OTP_REQUIRED");

          let sah = verifikasiTotp(user.totpSecret, otp);

          // Fallback: kode pemulihan sekali pakai (bcrypt hash, dikonsumsi).
          let indeksPemulihan = -1;
          if (!sah && user.recoveryKodes.length > 0) {
            const normal = normalisasiKodePemulihan(otp);
            for (let i = 0; i < user.recoveryKodes.length; i += 1) {
              // Bandingkan dengan & tanpa strip agar kode lama tetap valid.
              if (
                (await compare(normal, user.recoveryKodes[i])) ||
                (await compare(otp.toUpperCase(), user.recoveryKodes[i]))
              ) {
                indeksPemulihan = i;
                break;
              }
            }
            if (indeksPemulihan >= 0) sah = true;
          }

          if (!sah) {
            const gagal = user.totpUpayaGagal + 1;
            await prisma.user.update({
              where: { id: user.id },
              data:
                gagal >= BATAS_GAGAL_OTP
                  ? {
                      totpUpayaGagal: 0,
                      totpKunciSampai: new Date(Date.now() + DURASI_KUNCI_MS),
                    }
                  : { totpUpayaGagal: gagal },
            });
            throw new Error(
              gagal >= BATAS_GAGAL_OTP ? "OTP_TERKUNCI" : "OTP_INVALID",
            );
          }

          // Kode sah: reset limiter; konsumsi kode pemulihan bila dipakai.
          await prisma.user.update({
            where: { id: user.id },
            data: {
              totpUpayaGagal: 0,
              totpKunciSampai: null,
              ...(indeksPemulihan >= 0
                ? {
                    recoveryKodes: user.recoveryKodes.filter(
                      (_, i) => i !== indeksPemulihan,
                    ),
                  }
                : {}),
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.namaLengkap,
          username: user.username,
          roleId: user.roleId,
          roleNama: user.role.nama,
          permissions: user.role.permissions.map((rp) => rp.permission.kode),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.roleId = user.roleId;
        token.roleNama = user.roleNama;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.username = token.username;
        session.user.roleId = token.roleId;
        session.user.roleNama = token.roleNama;
        session.user.permissions = token.permissions ?? [];
      }
      return session;
    },
  },
};