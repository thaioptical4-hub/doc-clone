import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { getStoredAdmin } from "./adminStore"
import { checkCredentials, roleFor, type Role } from "./roles"

declare module "next-auth" {
  interface Session {
    role: Role
    username: string | null
  }
}

async function storedAdminOrNull() {
  try {
    return await getStoredAdmin()
  } catch (error) {
    console.error("Could not read admin settings", error)
    return undefined
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const stored = await storedAdminOrNull()
        const username = await checkCredentials(credentials.username, credentials.password, stored ?? null)
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
    async session({ session, token }) {
      const username = typeof token.username === "string" ? token.username : null
      const stored = await storedAdminOrNull()
      session.username = username
      // If the settings can't be read, fall back to the least access rather than the most.
      session.role = stored === undefined ? "staff" : roleFor(username, stored)
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
