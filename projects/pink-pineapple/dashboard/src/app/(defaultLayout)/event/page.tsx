"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import Events from "@/components/modules/Events/Events";

const poppins = { fontFamily: "Poppins, sans-serif" };
const garamond = { fontFamily: "Cormorant Garamond, serif" };

const EventPage = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="md:text-4xl text-3xl font-semibold text-[#FFFFFF]"
            style={{ ...garamond, letterSpacing: "0.02em" }}
          >
            Events
          </h1>
          <p className="text-[#B0B0B0] text-sm mt-2" style={poppins}>
            Manage all venue events
          </p>
        </div>
        <Link
          href="/event/create"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-[#000000] transition-all duration-200 hover:opacity-90"
          style={{ ...poppins, background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)" }}
        >
          <Plus size={16} />
          Add Event
        </Link>
      </div>

      {/* Events Table */}
      <Events />
    </div>
  );
};

export default EventPage;
