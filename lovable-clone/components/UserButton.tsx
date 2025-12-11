
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { User, LogOut } from 'lucide-react';
import { useState } from 'react';

export function UserButton() {
  const { data: session } = useSession();
  const [showMenu, setShowMenu] = useState(false);

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium hover:opacity-90 transition-opacity"
      >
        {session.user?.name?.[0] || <User className="w-4 h-4" />}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 z-50">
          <div className="px-4 py-2 border-b border-white/5">
            <p className="text-white text-sm font-medium truncate">{session.user?.name}</p>
            <p className="text-white/40 text-xs truncate">{session.user?.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full text-left px-4 py-2 text-red-400 hover:bg-white/5 text-sm flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}

      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
