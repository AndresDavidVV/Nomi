import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        phone: { label: "Celular", type: "text" },
        otp: { label: "Código", type: "text" },
      },
      authorize: async (credentials) => {
        // MOCK OTP VERIFICATION
        if (credentials.otp === "123456") {
          return {
            id: "user-1",
            name: "Piloto User",
            email: credentials.phone as string,
          }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
})
