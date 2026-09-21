'use client';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow text-center">
        <h1 className="text-2xl font-bold mb-2">訪問カルテ</h1>
        <p className="text-gray-500 mb-6">むさしの灯クリニック</p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Googleでログイン
        </button>
      </div>
    </div>
  );
}
