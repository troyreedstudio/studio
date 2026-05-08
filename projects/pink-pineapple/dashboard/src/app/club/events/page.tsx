"use client";
import ManageEvents from "@/components/modules/ManageEvents/ManageEvents";

const poppins = { fontFamily: "Poppins, sans-serif" };
const garamond = { fontFamily: "Outfit, sans-serif" };

const ClubEventsPage = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="md:text-4xl text-3xl font-semibold text-[#FFFFFF]"
          style={{ ...garamond, letterSpacing: "0.02em" }}
        >
          Special Events
        </h1>
        <p className="text-[#B0B0B0] text-sm mt-2 max-w-2xl" style={poppins}>
          One-off shows with named talent — headline DJs, festivals, ticketed
          nights. For your regular weekly programming (e.g. Hip Hop Wednesday,
          DJ all weekend), edit your venue profile instead.
        </p>
      </div>

      <ManageEvents />
    </div>
  );
};

export default ClubEventsPage;
