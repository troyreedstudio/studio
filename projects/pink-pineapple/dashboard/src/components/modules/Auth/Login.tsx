"use client";

import LoginForm from "./LoginForm";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const Login = () => {
  const [state, setState] = useState<"start" | "login">("start");

  return (
    <div className="min-h-screen bg-[#000000] flex">
      {/* Left panel — brand */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 px-16 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#8B4060]/5 via-transparent to-[#E8A0B0]/3 pointer-events-none" />
        <div className="relative z-10 text-center space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#C4707E] to-transparent" />
            <p className="text-[#B0B0B0] tracking-[0.4em] text-xs uppercase font-light" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
              Venue Partner Portal
            </p>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#C4707E] to-transparent" />
          </div>
          <Image
            src="/images/logo_primary_dark.jpg"
            alt="Pink Pineapple"
            width={280}
            height={90}
            className="object-contain"
            priority
          />
          <p className="text-[#B0B0B0] text-sm max-w-xs leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            Manage your events, bookings, and VIP experiences from one elegant dashboard.
          </p>
        </div>
      </div>

      {/* Right panel — auth */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 p-8 bg-[#000000] border-l border-[#2A2A2A]">
        {state === "start" ? (
          <div className="max-w-sm w-full space-y-8">
            {/* Mobile logo */}
            <div className="md:hidden text-center mb-8">
              <Image
                src="/images/logo_primary_dark.jpg"
                alt="Pink Pineapple"
                width={200}
                height={65}
                className="object-contain mx-auto"
                priority
              />
            </div>

            <div className="space-y-2">
              <h2
                className="text-3xl font-semibold text-[#FFFFFF]"
                style={{ fontFamily: 'Cormorant Garamond, serif' }}
              >
                Welcome Back
              </h2>
              <p className="text-[#B0B0B0] text-sm" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                Sign in to your venue partner account
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setState("login")}
                className="w-full py-4 rounded-xl text-[#000000] font-semibold text-sm tracking-wide transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
                  boxShadow: '0 4px 20px rgba(139, 64, 96, 0.3)',
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                Log In
              </button>

              <Link
                href="/register"
                className="w-full py-4 rounded-xl text-[#C4707E] font-semibold text-sm tracking-wide border border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#C4707E]/50 transition-all duration-200 inline-block text-center"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                Create Account
              </Link>
            </div>

            <p className="text-center text-[#6B6B6B] text-xs" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
              Venue partners only. Consumer app available on iOS & Android.
            </p>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </div>
  );
};

export default Login;
