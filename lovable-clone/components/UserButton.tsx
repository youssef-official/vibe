
'use client';

import { SignInButton, SignedIn, SignedOut, UserButton as ClerkUserButton } from "@clerk/nextjs";

export function UserButton() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <ClerkUserButton
            appearance={{
                elements: {
                    avatarBox: "w-9 h-9"
                }
            }}
        />
      </SignedIn>
    </>
  );
}
