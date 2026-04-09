/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { useAllUserQuery } from "@/redux/features/user/user.api";
import Image from "next/image";
import Pagination from "@/components/common/Pagination";
import ClubModal from "./ClubModal";
import BookingTable from "./BookingTable";
import { Skeleton } from "@/components/ui/skeleton";

const poppins = { fontFamily: "Poppins, sans-serif" };

const ClubListSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="flex justify-between items-center px-5 py-4 rounded-xl border border-[#2A2A2A] bg-[#000000]"
      >
        <div className="flex gap-4 items-center">
          <Skeleton className="h-12 w-12 rounded-full bg-[#1A1A1A]" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-[#1A1A1A] rounded" />
            <Skeleton className="h-3 w-48 bg-[#1A1A1A] rounded" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 bg-[#1A1A1A] rounded-lg" />
      </div>
    ))}
  </div>
);

const Approvals = () => {
  const [status, setStatus] = useState<"Booking" | "CLUB">("Booking");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data,
    isLoading,
  } = useAllUserQuery([
    { name: "limit", value: 15 },
    { name: "page", value: String(currentPage) },
    ...(status ? [{ name: "role", value: "CLUB" }] : []),
  ]);

  const users = data?.data?.data;
  const metaData = data?.data?.meta;

  const tabs: { label: string; value: "CLUB" | "Booking" }[] = [
    { label: "Booking", value: "Booking" },
    { label: "Clubs", value: "CLUB" },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-[#2A2A2A]">
        {tabs?.map((tab) => (
          <button
            key={tab.label}
            onClick={() => {
              setStatus(tab.value);
              setCurrentPage(1);
            }}
            className={`px-6 py-3 text-sm font-medium tracking-wide transition-all duration-200 border-b-2 -mb-px
              ${
                status === tab.value
                  ? "border-[#C4707E] text-[#C4707E]"
                  : "border-transparent text-[#B0B0B0] hover:text-[#FFFFFF]"
              }`}
            style={poppins}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {status === "CLUB" ? (
        <div className="space-y-2">
          {isLoading ? (
            <ClubListSkeleton />
          ) : (
            <>
              {users?.map((item: any) => (
                <div
                  key={item?.id}
                  className="flex justify-between items-center px-5 py-4 rounded-xl border border-[#2A2A2A] bg-[#000000] hover:bg-[#1A1A1A] transition-colors"
                >
                  <div className="flex gap-4 items-center">
                    <Image
                      src={item?.profileImage || "/placeholders/image_placeholder.png"}
                      alt="profile"
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover border border-[#2A2A2A]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-[#FFFFFF]" style={poppins}>
                          {item?.fullName}
                        </h3>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium
                            ${item?.status === "PENDING"
                              ? "text-yellow-400 bg-yellow-400/10"
                              : item?.status === "ACTIVE"
                              ? "text-emerald-400 bg-emerald-400/10"
                              : "text-red-400 bg-red-400/10"
                            }`}
                          style={poppins}
                        >
                          {item?.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#B0B0B0] mt-0.5" style={poppins}>
                        {item?.email}
                      </p>
                      {item?.typeOfVenue && (
                        <p className="text-[10px] text-[#6B6B6B] mt-0.5" style={poppins}>
                          {item.typeOfVenue}
                        </p>
                      )}
                    </div>
                  </div>
                  <ClubModal id={item?.id} status={status} />
                </div>
              ))}

              {users?.length < 1 && (
                <div className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="1.5">
                        <path d="M3 21h18" />
                        <path d="M5 21V7l8-4v18" />
                        <path d="M19 21V11l-6-4" />
                        <path d="M9 9h1" />
                        <path d="M9 13h1" />
                        <path d="M9 17h1" />
                      </svg>
                    </div>
                    <p className="text-[#B0B0B0] text-sm" style={poppins}>
                      No club applications to review.
                    </p>
                    <p className="text-[#6B6B6B] text-xs" style={poppins}>
                      New venue partner requests will appear here.
                    </p>
                  </div>
                </div>
              )}

              {metaData?.total > 15 && (
                <Pagination
                  currentPage={metaData?.page}
                  totalItem={metaData?.total}
                  limit={15}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              )}
            </>
          )}
        </div>
      ) : (
        <BookingTable />
      )}
    </div>
  );
};

export default Approvals;
