import { auth } from '@/lib/auth-config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === '/login';
  const isApiAuth = req.nextUrl.pathname.startsWith('/api/auth');
  // デモ画面とデモ用API（demo_visits テーブルのみ操作）は認証不要
  const path = req.nextUrl.pathname;
  const isDemo =
    path === '/demo' || path.startsWith('/demo/') || path === '/api/demo' || path.startsWith('/api/demo/');

  if (!isLoggedIn && !isLoginPage && !isApiAuth && !isDemo) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
