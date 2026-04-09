import Link from "next/link";
import { ShieldAlert } from "lucide-react";

const NotAuthorizedPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] text-center px-4">
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#000000] p-10 max-w-md w-full space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1
            className="text-2xl font-semibold text-[#FFFFFF]"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            Access Denied
          </h1>
          <p className="text-[#B0B0B0] text-sm leading-relaxed"
            style={{ fontFamily: 'Poppins, sans-serif' }}>
            You don&apos;t have permission to view this page. Please check your
            account role or contact the administrator.
          </p>
        </div>

        <Link
          href="/login"
          className="inline-block w-full py-3 rounded-xl text-sm font-semibold text-[#000000] tracking-wide transition-all duration-200 hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          Back to Login
        </Link>
      </div>

      <p className="mt-8 text-[#6B6B6B] text-xs"
        style={{ fontFamily: 'Poppins, sans-serif' }}>
        © {new Date().getFullYear()} Pink Pineapple. All rights reserved.
      </p>
    </div>
  );
};

export default NotAuthorizedPage;
