import "@/lib/env";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { sendSesEmail } from "@/lib/ses";
import { rateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { getUserTier } from "@/lib/billing";

const logger = createLogger("auth");

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login",
  },
  providers: [
    {
      id: "ses",
      name: "Email",
      type: "email",
      maxAge: 10 * 60, // 10 minutes
      sendVerificationRequest: async ({ identifier: email, token, url }) => {
        const rl = await rateLimit(`magic-link:${email}`, 3, 15 * 60 * 1000);
        if (!rl.allowed) {
          throw new Error("Too many verification requests. Please wait a few minutes.");
        }

        const from = process.env.SES_FROM_EMAIL || "AirIndex <auth@airindex.io>";

        if (!process.env.SES_ACCESS_KEY_ID) {
          if (process.env.NODE_ENV === "development") {
            logger.info(`Dev mode — magic link: ${url}`);
          }
          return;
        }

        const html = `
          <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
            <div style="margin-bottom:32px;">
              <span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:#0077aa;letter-spacing:0.12em;">INDEX</span>
            </div>
            <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Click the button below to sign in to AirIndex:
            </p>
            <a href="${url}" style="display:inline-block;padding:14px 32px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;margin:0 0 24px;">
              Sign in to AirIndex
            </a>
            <p style="color:#999;font-size:12px;line-height:1.6;margin:0 0 0;">
              This link expires in 10 minutes. If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `.trim();

        try {
          await sendSesEmail({
            to: email,
            from,
            subject: "Sign in to AirIndex",
            html,
          });
          logger.info(`Magic link sent successfully to ${email}`);
        } catch (err) {
          logger.error(`Failed to send magic link to ${email}:`, err);
          throw err;
        }
      },
    },
  ],
  events: {
    async createUser({ user }) {
      if (!process.env.SES_ACCESS_KEY_ID) return;
      const from = process.env.SES_FROM_EMAIL || "AirIndex <auth@airindex.io>";
      const appUrl = process.env.APP_URL || "https://www.airindex.io";

      // Welcome email to the new user
      if (user.email) {
        sendSesEmail({
          to: user.email,
          from,
          subject: "Welcome to AirIndex",
          html: `
            <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
              <div style="margin-bottom:32px;">
                <span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:#0077aa;letter-spacing:0.12em;">INDEX</span>
              </div>
              <p style="color:#333;font-size:16px;font-weight:600;line-height:1.6;margin:0 0 16px;">
                Welcome to AirIndex.
              </p>
              <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 8px;">
                You now have access to market readiness scores, regulatory filings, corridor tracking, and alert subscriptions across 20+ US urban air mobility markets.
              </p>
              <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
                Subscribe to alerts on any city page to get notified when filings, legislation, or FAA updates drop.
              </p>
              <a href="${appUrl}/dashboard" style="display:inline-block;padding:12px 28px;background:#00d4ff;color:#050508;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;">
                Open Dashboard
              </a>
              <p style="color:#bbb;font-size:11px;margin-top:32px;line-height:1.6;">
                AirIndex — the independent readiness rating system for urban air mobility.
              </p>
            </div>
          `.trim(),
        }).catch((err) => logger.error("Welcome email failed:", err));
      }

      // Admin notification
      const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
      if (adminEmail) {
        sendSesEmail({
          to: adminEmail,
          from,
          subject: `[AirIndex] New signup: ${user.email}`,
          html: `
            <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
              <div style="margin-bottom:32px;">
                <span style="font-weight:800;font-size:20px;color:#1a1a1a;letter-spacing:-0.5px;">AIRINDEX</span>
                <span style="color:#999;font-size:11px;margin-left:8px;">ADMIN</span>
              </div>
              <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 8px;">New user signed up:</p>
              <p style="color:#7c3aed;font-size:16px;font-weight:700;margin:0 0 8px;">${user.email}</p>
              <p style="color:#999;font-size:12px;margin:0;">${new Date().toUTCString()}</p>
            </div>
          `.trim(),
        }).catch((err) => logger.error("Admin notify failed:", err));
      }
    },
    async signIn({ user }) {
      if (!process.env.SES_ACCESS_KEY_ID) return;
      const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
      if (!adminEmail || !user.email) return;
      // Skip notifications for admin's own logins
      if (user.email === adminEmail) return;

      const from = process.env.SES_FROM_EMAIL || "AirIndex <auth@airindex.io>";
      sendSesEmail({
        to: adminEmail,
        from,
        subject: `[AirIndex] Login: ${user.email}`,
        html: `
          <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
            <div style="margin-bottom:32px;">
              <span style="font-weight:800;font-size:20px;color:#1a1a1a;letter-spacing:-0.5px;">AIRINDEX</span>
              <span style="color:#999;font-size:11px;margin-left:8px;">ADMIN</span>
            </div>
            <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 8px;">User signed in:</p>
            <p style="color:#7c3aed;font-size:16px;font-weight:700;margin:0 0 8px;">${user.email}</p>
            <p style="color:#999;font-size:12px;margin:0;">${new Date().toUTCString()}</p>
          </div>
        `.trim(),
      }).catch((err) => logger.error("Sign-in notification failed:", err));
    },
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      // Refresh tier on sign-in or when session update is triggered
      if ((user || trigger === "update") && token.sub) {
        try {
          token.tier = await getUserTier(token.sub);
        } catch (err) {
          logger.error("Failed to fetch user tier:", err);
          token.tier = token.tier ?? "free";
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
        session.user.tier = (token.tier as string) ?? "free";
      }
      return session;
    },
  },
});
