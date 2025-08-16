import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    apiToken?: string;
    userId?: string | number;
  }

  interface User extends DefaultUser {
    apiToken?: string;
  }
}