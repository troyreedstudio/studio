/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import {
  useAvailableDaysQuery,
  useAvailableTimeQuery,
  useInsertDaysMutation,
  useInsertTimesMutation,
} from "@/redux/features/register/register.api";
import { useState } from "react";
import { toast } from "sonner";

const Availability = () => {
  const [days, setDay] = useState<string[]>([]);
  const [times, settime] = useState<string[]>([]);
  const { data: availableDays } = useAvailableDaysQuery(undefined);
  const { data: availableTimes } = useAvailableTimeQuery(undefined);
  const [insertDays] = useInsertDaysMutation();
  const [insertTimes] = useInsertTimesMutation();

  const handelDaySelect = (id: string) => {
    if (days.includes(id)) {
      setDay(days.filter((day) => day !== id));
    } else {
      setDay([...days, id]);
    }
  };

  const handelTimeSelect = (id: string) => {
    if (times.includes(id)) {
      settime(times.filter((day) => day !== id));
    } else {
      settime([...times, id]);
    }
  };

  const handleAvailable = async () => {
    const toastId = toast.loading("Updating...");
    try {
      await insertDays({ dayIds: days }).unwrap();
      await insertTimes({ timesId: times }).unwrap();
      toast.success("Update success", { id: toastId });
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to Update", { id: toastId });
    }
  };

  return (
    <div className="space-y-8 mt-8">
      <h3
        className="md:text-3xl text-2xl font-semibold text-[#FFFFFF]"
        style={{ fontFamily: 'Cormorant Garamond, serif' }}
      >
        Availability
      </h3>

      <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 max-w-5xl space-y-8">
        {/* Days */}
        <div className="space-y-3">
          <h3
            className="text-sm text-[#B0B0B0] uppercase tracking-widest"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Select Days
          </h3>
          <div className="flex flex-wrap gap-3">
            {availableDays?.data?.map((item: any) => (
              <div
                key={item?.id}
                onClick={() => handelDaySelect(item?.id)}
                className={`px-5 py-3 rounded-xl border text-sm cursor-pointer transition-all duration-200 select-none
                  ${days.includes(item?.id)
                    ? "border-[#C4707E] text-[#000000] font-medium"
                    : "border-[#2A2A2A] text-[#B0B0B0] hover:border-[#C4707E]/50 hover:text-[#FFFFFF]"
                  }`}
                style={
                  days.includes(item?.id)
                    ? { background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)', fontFamily: 'Poppins, sans-serif' }
                    : { fontFamily: 'Poppins, sans-serif' }
                }
              >
                {item?.day}
              </div>
            ))}
          </div>
        </div>

        {/* Times */}
        <div className="space-y-3">
          <h3
            className="text-sm text-[#B0B0B0] uppercase tracking-widest"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Select Time
          </h3>
          <div className="flex flex-wrap gap-3">
            {availableTimes?.data?.map((item: any) => (
              <div
                key={item?.id}
                onClick={() => handelTimeSelect(item?.id)}
                className={`px-5 py-3 rounded-xl border text-sm cursor-pointer transition-all duration-200 select-none
                  ${times.includes(item?.id)
                    ? "border-[#C4707E] text-[#000000] font-medium"
                    : "border-[#2A2A2A] text-[#B0B0B0] hover:border-[#C4707E]/50 hover:text-[#FFFFFF]"
                  }`}
                style={
                  times.includes(item?.id)
                    ? { background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)', fontFamily: 'Poppins, sans-serif' }
                    : { fontFamily: 'Poppins, sans-serif' }
                }
              >
                {item?.time}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleAvailable}
          className="w-full py-3 rounded-xl text-[#000000] font-semibold text-sm tracking-wide transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
            boxShadow: '0 4px 16px rgba(139, 64, 96, 0.25)',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          Save Availability
        </button>
      </div>
    </div>
  );
};

export default Availability;
