import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { sendSesEmail } from "@/lib/ses";

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      maxAge: 60 * 60, // 1 hour
      sendVerificationRequest: async ({ identifier: email, url }) => {
        const from = process.env.SES_FROM_EMAIL || "AirIndex <auth@airindex.io>";

        if (!process.env.SES_ACCESS_KEY_ID) {
          console.log(`[auth] AWS credentials not set — magic link: ${url}`);
          return;
        }

        const html = `
          <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
            <div style="margin-bottom:32px;">
              <span style="font-weight:800;font-size:20px;color:#1a1a1a;letter-spacing:-0.5px;">AIRINDEX</span>
            </div>
            <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Click the button below to sign in to AirIndex.
            </p>
            <a href="${url}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:6px;text-decoration:none;letter-spacing:0.04em;">
              SIGN IN TO AIRINDEX
            </a>
            <p style="color:#999;font-size:12px;line-height:1.6;margin:28px 0 0;">
              If you didn't request this, you can safely ignore this email.
            </p>
            <p style="color:#bbb;font-size:11px;margin:24px 0 0;">
              Or copy this link: <a href="${url}" style="color:#7c3aed;word-break:break-all;">${url}</a>
            </p>
          </div>
        `.trim();

        await sendSesEmail({
          to: email,
          from,
          subject: "Sign in to AirIndex",
          html,
        });
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
