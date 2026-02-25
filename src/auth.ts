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

        if (!process.env.AWS_ACCESS_KEY_ID) {
          console.log(`[auth] AWS credentials not set — magic link: ${url}`);
          return;
        }

        const html = `
          <div style="background:#050508;color:#fff;font-family:'Courier New',monospace;padding:32px;max-width:520px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
              <span style="font-weight:800;font-size:16px;letter-spacing:-0.5px;">AIRINDEX</span>
              <span style="color:#555;font-size:9px;letter-spacing:2px;">SIGN IN</span>
            </div>
            <div style="border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:20px;background:rgba(255,255,255,0.02);">
              <p style="color:#999;font-size:13px;line-height:1.6;margin:0 0 20px;">
                Click the button below to sign in to AirIndex.
              </p>
              <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#00d4ff,#7c3aed);color:#000;font-weight:700;font-size:13px;padding:12px 28px;border-radius:6px;text-decoration:none;letter-spacing:0.06em;">
                SIGN IN
              </a>
              <p style="color:#444;font-size:11px;margin:20px 0 0;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
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
