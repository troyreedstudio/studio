import UserInfo from "@/components/modules/Settings/UserInfo";
import React from "react";

// The legacy Availability picker (ClubAvailableDays/Times) used to live
// here from the original Fiverr build's registration flow. It has been
// fully superseded by the Weekly Programming editor on /club/venue, so
// it's no longer rendered. The legacy backend tables can be cleaned up
// later — removing the UI removes the user-facing confusion now.
const page = () => {
  return (
    <div>
      <h1
        className="md:text-3xl text-2xl font-semibold mb-6 text-[#FFFFFF]"
        style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '0.02em' }}
      >
        Settings
      </h1>
      <UserInfo />
    </div>
  );
};

export default page;
