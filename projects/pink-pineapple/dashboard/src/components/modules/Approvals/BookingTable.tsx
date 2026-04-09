/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Pagination from "@/components/common/Pagination";
import { useAllBookingsQuery } from "@/redux/features/events/events.spi";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Spinner from "@/components/common/Spinner";
import BookingModal from "./BookingModal";

const BookingTable = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading } = useAllBookingsQuery([
    { name: "limit", value: 15 },
    { name: "page", value: String(currentPage) },
  ]);

  const bookings = data?.data?.data;

  if (isLoading) {
    return <Spinner />;
  }

  const metaData = data?.data?.meta;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#2A2A2A] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#2A2A2A] bg-[#000000] hover:bg-[#000000]">
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                Event
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                Guest
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                Type
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                Date
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                Status
              </TableHead>
              <TableHead className="text-xs text-[#B0B0B0] font-medium tracking-widest uppercase py-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings?.map((item: any) => (
              <TableRow
                key={item.id}
                className="border-b border-[#2A2A2A] bg-[#000000] hover:bg-[#1A1A1A] transition-colors"
              >
                <TableCell className="py-5 text-[#FFFFFF] text-sm font-medium"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {item?.event?.eventName}
                </TableCell>
                <TableCell className="text-[#B0B0B0] text-sm"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {item?.user?.fullName}
                </TableCell>
                <TableCell className="text-[#B0B0B0] text-sm"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {item?.bookingType}
                </TableCell>
                <TableCell className="text-[#B0B0B0] text-sm"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {new Date(item?.event?.startDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium
                      ${item?.status === "PENDING"
                        ? "text-yellow-400 bg-yellow-400/10"
                        : item?.status === "ACCEPTED"
                        ? "text-emerald-400 bg-emerald-400/10"
                        : "text-red-400 bg-red-400/10"
                      }`}
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {item?.status}
                  </span>
                </TableCell>
                <TableCell>
                  <BookingModal data={item} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {bookings?.length < 1 && (
        <div className="py-16 text-center">
          <p className="text-[#B0B0B0] text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
            No bookings found.
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

export default BookingTable;
