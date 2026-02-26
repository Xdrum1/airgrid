import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { sendSesEmail } from "@/lib/ses";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
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
      generateVerificationToken: () => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[auth] Generated verification code: ${code}`);
        return code;
      },
      sendVerificationRequest: async ({ identifier: email, token }) => {
        const from = process.env.SES_FROM_EMAIL || "AirIndex <auth@airindex.io>";

        if (!process.env.SES_ACCESS_KEY_ID) {
          console.log(`[auth] AWS credentials not set — verification code: ${token}`);
          return;
        }

        console.log(`[auth] Sending verification code to ${email}`);

        const html = `
          <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
            <div style="margin-bottom:32px;">
              <span style="font-weight:800;font-size:20px;color:#1a1a1a;letter-spacing:-0.5px;">AIRINDEX</span>
            </div>
            <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Your verification code for AirIndex:
            </p>
            <div style="background:#f5f3ff;border:2px solid #7c3aed;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
              <span style="font-family:'Courier New',monospace;font-size:32px;font-weight:700;color:#7c3aed;letter-spacing:8px;">${token}</span>
            </div>
            <p style="color:#999;font-size:12px;line-height:1.6;margin:0 0 0;">
              This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `.trim();

        try {
          await sendSesEmail({
            to: email,
            from,
            subject: `${token} — Your AirIndex verification code`,
            html,
          });
          console.log(`[auth] Verification code sent successfully to ${email}`);
        } catch (err) {
          console.error(`[auth] Failed to send verification code to ${email}:`, err);
          throw err;
        }
      },
    },
  ],
  events: {
    async createUser({ user }) {
      const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
      if (!adminEmail || !process.env.SES_ACCESS_KEY_ID) return;
      const from = process.env.SES_FROM_EMAIL || "AirIndex <auth@airindex.io>";
      await sendSesEmail({
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
      }).catch((err) => console.error("[auth] Admin notify failed:", err));
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
