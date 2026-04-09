import { Sparkle } from "lucide-react";
import React from "react";

const Spinner = () => {
  return (
    <div className="md:py-10 py-5 flex justify-center items-center">
      <div className="animate-spin">
        <Sparkle className="text-primary" size={40}/>
      </div>
    </div>
  );
};

export default Spinner;
