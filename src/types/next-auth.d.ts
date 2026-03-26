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
      billingStatus?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tier?: string;
    billingStatus?: string;
    firstName?: string | null;
    lastName?: string | null;
  }
}
