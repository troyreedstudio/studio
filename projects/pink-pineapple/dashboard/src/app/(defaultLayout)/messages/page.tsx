"use client";
import { MessageCircle } from "lucide-react";

const inter = { fontFamily: "Poppins, sans-serif" };
const playfair = { fontFamily: "Cormorant Garamond, serif" };

const MessagesPage = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="md:text-4xl text-3xl font-semibold text-[#FFFFFF]"
          style={{ ...playfair, letterSpacing: "0.02em" }}
        >
          Messages
        </h1>
        <p className="text-[#B0B0B0] text-sm mt-2" style={inter}>
          Venue inquiries and support
        </p>
      </div>

      {/* Empty State */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-24">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#2A2A2A] flex items-center justify-center">
            <MessageCircle size={28} className="text-[#C4707E]" />
          </div>
          <div>
            <p className="text-[#FFFFFF] font-medium text-sm" style={inter}>
              No messages yet
            </p>
            <p className="text-[#B0B0B0] text-xs mt-1 max-w-xs" style={inter}>
              Venue inquiries and support conversations will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
