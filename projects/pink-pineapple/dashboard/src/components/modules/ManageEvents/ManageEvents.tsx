/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Pagination from "@/components/common/Pagination";
import Spinner from "@/components/common/Spinner";
import { useMyEventsQuery } from "@/redux/features/events/events.spi";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

const ManageEvents = () => {
  const [status, setStatus] = useState<
    "PENDING" | "APPROVED" | "REJECTED" | "ONGOING" | "UPCOMING" | "COMPLETED"
  >("PENDING");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data,
    isLoading,
    status: state,
    error,
  } = useMyEventsQuery([
    { name: "limit", value: 15 },
    { name: "page", value: String(currentPage) },
    ...(status ? [{ name: "eventStatus", value: status }] : []),
  ]);

  const events = data?.data?.data;

  if (isLoading || state === "pending") {
    return <Spinner />;
  }

  const tabs: {
    label: string;
    value: "PENDING" | "APPROVED" | "REJECTED" | "ONGOING" | "UPCOMING" | "COMPLETED";
  }[] = [
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Ongoing", value: "ONGOING" },
    { label: "Upcoming", value: "UPCOMING" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  const metaData = data?.data?.meta;

  if (error) {
    const err = error as any;
    const message =
      "data" in err
        ? err?.data?.message || "Something went wrong"
        : "An unexpected error occurred";

    return (
      <p className="text-center text-lg font-semibold my-12 text-[#C4707E]"
        style={{ fontFamily: 'Poppins, sans-serif' }}>
        {message}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-[#2A2A2A] overflow-x-auto">
        {tabs?.map((tab) => (
          <button
            key={tab.label}
            onClick={() => {
              setStatus(tab.value);
              setCurrentPage(1);
            }}
            className={`px-5 py-3 text-sm font-medium tracking-wide transition-all duration-200 border-b-2 -mb-px whitespace-nowrap
              ${status === tab.value
                ? "border-[#C4707E] text-[#C4707E]"
                : "border-transparent text-[#B0B0B0] hover:text-[#FFFFFF]"
              }`}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Create Event button */}
      <div className="flex justify-end w-full">
        <Link
          href="/club/event"
          className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold text-[#000000] tracking-wide transition-all duration-200 hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
            boxShadow: '0 4px 16px rgba(139, 64, 96, 0.25)',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          + Create Event
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#2A2A2A] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#2A2A2A] bg-[#000000] hover:bg-[#000000]">
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                Event Name
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                Start Date
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                End Date
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                Guests
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events?.map((item: any) => (
              <TableRow
                key={item.id}
                className="border-b border-[#2A2A2A] bg-[#000000] hover:bg-[#1A1A1A] transition-colors"
              >
                <TableCell className="py-5 text-[#FFFFFF] text-sm font-medium"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {item?.eventName}
                </TableCell>
                <TableCell className="text-[#B0B0B0] text-sm"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {new Date(item?.startDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-[#B0B0B0] text-sm"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {new Date(item?.endDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-[#B0B0B0] text-sm"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {item?.additionalGuests || 0}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/club/event/${item?.id}`}
                    className="inline-block px-4 py-2 rounded-lg text-xs font-semibold text-[#000000] tracking-wide transition-all duration-200 hover:opacity-90"
                    style={{
                      background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  >
                    View Details
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {events?.length < 1 && (
        <div className="py-16 text-center">
          <p className="text-[#B0B0B0] text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
            No events found.
          </p>
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
    </div>
  );
};

export default ManageEvents;
