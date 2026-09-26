import { auth } from '@/lib/auth-config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === '/login';
  const isApiAuth = req.nextUrl.pathname.startsWith('/api/auth');
  // デモ画面は認証不要（DB・Gemini APIには一切接続しない）
  const isDemo = req.nextUrl.pathname === '/demo' || req.nextUrl.pathname.startsWith('/demo/');

  if (!isLoggedIn && !isLoginPage && !isApiAuth && !isDemo) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
