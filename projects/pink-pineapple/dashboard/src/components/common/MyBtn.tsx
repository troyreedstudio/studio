import React from "react";

const MyBtn = ({
  name,
  width = "w-auto",
}: {
  name: string;
  width?: string;
}) => {
  return (
    <button
      className={`md:text-base text-sm px-8 py-3 text-[#000000] font-semibold rounded-xl transition-all duration-200 ${width}`}
      style={{
        background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
        boxShadow: '0 4px 16px rgba(139, 64, 96, 0.25)',
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      {name}
    </button>
  );
};

export default MyBtn;
