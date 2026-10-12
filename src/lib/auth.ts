import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { checkCredentials, roleFor, type Role } from "./roles"

declare module "next-auth" {
  interface Session {
    role: Role
    username: string | null
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const username = checkCredentials(credentials.username, credentials.password)
        if (!username) return null
        return { id: username, name: username }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.username = user.id
      return token
    },
    session({ session, token }) {
      const username = typeof token.username === "string" ? token.username : null
      session.username = username
      session.role = roleFor(username)
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },
})
