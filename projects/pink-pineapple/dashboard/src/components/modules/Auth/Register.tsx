"use client";

import RegisterForm from "./RegisterForm";

const Register = () => {
  return (
    <div className="min-h-screen bg-[#000000] flex">
      {/* Left panel — brand */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#8B4060]/5 via-transparent to-[#E8A0B0]/3 pointer-events-none" />
        <div className="relative z-10 text-center space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#C4707E] to-transparent" />
            <p className="text-[#B0B0B0] tracking-[0.4em] text-xs uppercase font-light"
              style={{ fontFamily: 'Poppins, sans-serif' }}>
              Venue Partner Portal
            </p>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#C4707E] to-transparent" />
          </div>
          <h1
            className="text-5xl font-semibold text-[#FFFFFF] tracking-widest"
            style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.15em' }}
          >
            PINK PINEAPPLE
          </h1>
          <p
            className="text-[#C4707E] tracking-[0.6em] text-sm font-light"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            BALI
          </p>
          <p className="text-[#B0B0B0] text-sm max-w-xs leading-relaxed"
            style={{ fontFamily: 'Poppins, sans-serif' }}>
            Join as a venue partner and manage your events, bookings, and VIP experiences.
          </p>
        </div>
      </div>

      {/* Right panel — register form */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 p-8 bg-[#000000] border-l border-[#2A2A2A] overflow-y-auto">
        {/* Mobile logo */}
        <div className="md:hidden text-center mb-8">
          <h1
            className="text-3xl font-semibold text-[#FFFFFF] tracking-widest"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            PINK PINEAPPLE
          </h1>
          <p className="text-[#C4707E] tracking-[0.5em] text-xs mt-1"
            style={{ fontFamily: 'Poppins, sans-serif' }}>
            BALI
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
};

export default Register;
