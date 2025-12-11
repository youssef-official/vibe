
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // Mock authentication - allow any login
        if (credentials?.username) {
             return { id: "1", name: credentials.username, email: `${credentials.username}@example.com` }
        }
        return null;
      }
    })
  ],
  secret: "secret-key-for-demo-only", // In prod use env var
  pages: {
      signIn: '/auth/signin' // Optional, but helps if we want custom page. Using default for now.
  }
});

export { handler as GET, handler as POST };
