import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      image?: string | null;
      tier: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tier?: string;
    firstName?: string | null;
    lastName?: string | null;
  }
}
