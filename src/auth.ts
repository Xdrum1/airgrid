import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

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
      id: "resend",
      name: "Email",
      type: "email",
      maxAge: 60 * 60, // 1 hour
      sendVerificationRequest: async ({ identifier: email, url }) => {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          console.log(`[auth] RESEND_API_KEY not set — magic link: ${url}`);
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

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "AirIndex <auth@updates.airgrid.io>",
            to: email,
            subject: "Sign in to AirIndex",
            html,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Resend error ${res.status}: ${body}`);
        }
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
