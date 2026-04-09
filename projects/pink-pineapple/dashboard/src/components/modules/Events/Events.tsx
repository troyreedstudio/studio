/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Pagination from "@/components/common/Pagination";
import Spinner from "@/components/common/Spinner";
import { useAllEventsQuery } from "@/redux/features/events/events.spi";
import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import Image from "next/image";

const poppins = { fontFamily: "Poppins, sans-serif" };
const garamond = { fontFamily: "Cormorant Garamond, serif" };

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "text-yellow-400 bg-yellow-400/10",
    APPROVED: "text-emerald-400 bg-emerald-400/10",
    REJECTED: "text-red-400 bg-red-400/10",
    ONGOING: "text-blue-400 bg-blue-400/10",
    UPCOMING: "text-purple-400 bg-purple-400/10",
    COMPLETED: "text-[#B0B0B0] bg-[#B0B0B0]/10",
  };
  return map[status] || "text-[#B0B0B0] bg-[#B0B0B0]/10";
};

const Events = () => {
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">(
    "PENDING"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");

  const {
    data,
    isLoading,
    status: state,
  } = useAllEventsQuery([
    { name: "limit", value: 15 },
    { name: "page", value: String(currentPage) },
    ...(status ? [{ name: "eventStatus", value: status }] : []),
  ]);

  const events = data?.data?.data;

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!search.trim()) return events;
    return events.filter((item: any) =>
      item?.eventName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [events, search]);

  if (isLoading || state === "pending") {
    return <Spinner />;
  }

  const tabs: { label: string; value: "PENDING" | "APPROVED" | "REJECTED" }[] =
    [
      { label: "Pending", value: "PENDING" },
      { label: "Approved", value: "APPROVED" },
      { label: "Rejected", value: "REJECTED" },
    ];

  const metaData = data?.data?.meta;

  return (
    <div className="space-y-6">
      {/* Search + Tabs row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex border-b border-[#2A2A2A]">
          {tabs?.map((tab) => (
            <button
              key={tab.label}
              onClick={() => {
                setStatus(tab.value);
                setCurrentPage(1);
                setSearch("");
              }}
              className={`px-6 py-3 text-sm font-medium tracking-wide transition-all duration-200 border-b-2 -mb-px
                ${
                  status === tab.value
                    ? "border-[#C4707E] text-[#C4707E]"
                    : "border-transparent text-[#B0B0B0] hover:text-[#FFFFFF]"
                }`}
              style={poppins}
            >
              {tab?.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B0B0]"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#000000] text-[#FFFFFF] text-sm placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#C4707E]/50 transition-colors w-full sm:w-64"
            style={poppins}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#2A2A2A] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#2A2A2A] bg-[#000000] hover:bg-[#000000]">
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4" style={poppins}>
                Event
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4" style={poppins}>
                Start Date
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 hidden md:table-cell" style={poppins}>
                End Date
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4 hidden sm:table-cell" style={poppins}>
                Guests
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4" style={poppins}>
                Status
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4" style={poppins}>
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents?.map((item: any) => (
              <TableRow
                key={item?.id}
                className="border-b border-[#2A2A2A] bg-[#000000] hover:bg-[#1A1A1A] transition-colors"
              >
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    {item?.eventImages?.[0] ? (
                      <Image
                        src={item.eventImages[0]}
                        alt={item.eventName}
                        width={44}
                        height={44}
                        className="w-11 h-11 rounded-lg object-cover border border-[#2A2A2A] flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#C4707E] text-xs flex-shrink-0" style={garamond}>
                        PP
                      </div>
                    )}
                    <span className="text-sm font-medium text-[#FFFFFF]" style={poppins}>
                      {item?.eventName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-[#B0B0B0] text-sm" style={poppins}>
                  {new Date(item?.startDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-[#B0B0B0] text-sm hidden md:table-cell" style={poppins}>
                  {new Date(item?.endDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-[#B0B0B0] text-sm hidden sm:table-cell" style={poppins}>
                  {item?.additionalGuests || 0}
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge(item?.eventStatus || status)}`}
                    style={poppins}
                  >
                    {item?.eventStatus || status}
                  </span>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/event/${item?.id}`}
                    className="inline-block px-4 py-2 rounded-lg text-xs font-semibold text-[#000000] tracking-wide transition-all duration-200 hover:opacity-90"
                    style={{
                      background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
                      ...poppins,
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

      {filteredEvents?.length < 1 && (
        <div className="py-16 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">🔍</span>
            <p className="text-[#B0B0B0] text-sm" style={poppins}>
              {search ? `No events matching "${search}"` : "No events found."}
            </p>
          </div>
        </div>
      )}

      {!search && metaData?.total > 15 && (
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

export default Events;
