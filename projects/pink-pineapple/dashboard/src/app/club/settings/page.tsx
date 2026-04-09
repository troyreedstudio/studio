import Availability from "@/components/modules/Club/Availability";
import UserInfo from "@/components/modules/Settings/UserInfo";
import React from "react";

const page = () => {
  return (
    <div>
      <h1
        className="md:text-3xl text-2xl font-semibold mb-6 text-[#FFFFFF]"
        style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.02em' }}
      >
        Settings
      </h1>
      <UserInfo />
      <Availability />
    </div>
  );
};

export default page;
