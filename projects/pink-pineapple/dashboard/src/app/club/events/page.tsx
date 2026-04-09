"use client";
import ManageEvents from "@/components/modules/ManageEvents/ManageEvents";

const poppins = { fontFamily: "Poppins, sans-serif" };
const garamond = { fontFamily: "Cormorant Garamond, serif" };

const ClubEventsPage = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="md:text-4xl text-3xl font-semibold text-[#FFFFFF]"
          style={{ ...garamond, letterSpacing: "0.02em" }}
        >
          Your Events
        </h1>
        <p className="text-[#B0B0B0] text-sm mt-2" style={poppins}>
          Manage and track all your venue events
        </p>
      </div>

      <ManageEvents />
    </div>
  );
};

export default ClubEventsPage;
