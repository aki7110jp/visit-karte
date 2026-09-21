import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { ALLOWED_EMAILS } from './auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return ALLOWED_EMAILS.includes(user.email ?? '');
    },
  },
  pages: {
    signIn: '/login',
  },
});
