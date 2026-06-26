import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const user = process.env.APP_USER
        const pass = process.env.APP_PASS

        if (!user || !pass) return null
        if (credentials.username === user && credentials.password === pass) {
          return { id: "1", name: "Admin" }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})
