/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import DeleteModal from "@/components/common/DeleteModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";

const BookingModal = ({ data }: { data: any }) => {
  if (!data) return null;

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusStyle: Record<string, string> = {
    PENDING: "text-yellow-400 bg-yellow-400/10",
    ACCEPTED: "text-emerald-400 bg-emerald-400/10",
    CONFIRMED: "text-emerald-400 bg-emerald-400/10",
    REJECTED: "text-red-400 bg-red-400/10",
    CANCELLED: "text-red-400 bg-red-400/10",
  };

  return (
    <Dialog>
      <DialogTrigger
        className="inline-block px-4 py-2 rounded-lg text-xs font-semibold text-[#000000] tracking-wide transition-all duration-200 hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        View Details
      </DialogTrigger>

      <DialogContent className="max-w-2xl border border-[#2A2A2A] bg-[#1A1A1A] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="text-xl font-semibold text-[#FFFFFF] mb-2"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            Booking Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* User */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-4">
            <p className="text-xs text-[#B0B0B0] uppercase tracking-widest mb-3"
              style={{ fontFamily: 'Poppins, sans-serif' }}>Guest</p>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden border border-[#2A2A2A] bg-[#000000] flex-shrink-0">
                {data?.user?.profileImage ? (
                  <Image
                    src={data?.user.profileImage}
                    alt={data?.user.fullName}
                    width={56}
                    height={56}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-[#C4707E] font-bold text-lg"
                    style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    {data?.user?.fullName?.charAt(0) || "U"}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[#FFFFFF]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {data?.user?.fullName}
                </p>
                <p className="text-xs text-[#B0B0B0]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {data?.user?.email}
                </p>
                {data?.user?.fullAddress && (
                  <p className="text-xs text-[#B0B0B0]"
                    style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {data?.user?.fullAddress}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Event */}
          {data?.event && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-4">
              <p className="text-xs text-[#B0B0B0] uppercase tracking-widest mb-3"
                style={{ fontFamily: 'Poppins, sans-serif' }}>Event</p>
              <p className="text-sm font-medium text-[#FFFFFF] mb-1"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                {data?.event.eventName}
              </p>
              <p className="text-xs text-[#B0B0B0]"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                Start: {formatDate(data?.event.startDate)}
              </p>
              <p className="text-xs text-[#B0B0B0]"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                End: {formatDate(data?.event.endDate)}
              </p>
            </div>
          )}

          {/* Table */}
          {data?.table && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-4">
              <p className="text-xs text-[#B0B0B0] uppercase tracking-widest mb-3"
                style={{ fontFamily: 'Poppins, sans-serif' }}>Table</p>
              <p className="text-sm font-medium text-[#FFFFFF] mb-1"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                {data?.table.tableName}
              </p>
              <p className="text-xs text-[#B0B0B0] mb-3"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                {data?.table.tableDetails}
              </p>

              {data?.table.tableImages?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {data?.table.tableImages.map((img: string, i: number) => (
                    <Image
                      key={i}
                      src={img}
                      alt="Table"
                      width={100}
                      height={80}
                      className="rounded-lg object-cover border border-[#2A2A2A] h-20 w-auto"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-4">
            <p className="text-xs text-[#B0B0B0] uppercase tracking-widest mb-3"
              style={{ fontFamily: 'Poppins, sans-serif' }}>Summary</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Booking Type", value: data?.bookingType },
                { label: "Guests", value: data?.guest },
                { label: "Males", value: data?.numberOfMale },
                { label: "Females", value: data?.numberOfFemale },
                { label: "Paid Amount", value: `£${data?.paidAmount}` },
                { label: "Created", value: formatDate(data?.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-0.5">
                  <p className="text-xs text-[#B0B0B0]"
                    style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</p>
                  <p className="text-sm text-[#FFFFFF]"
                    style={{ fontFamily: 'Poppins, sans-serif' }}>{value}</p>
                </div>
              ))}
              <div className="space-y-0.5">
                <p className="text-xs text-[#B0B0B0]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>Status</p>
                <span
                  className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[data?.status] || "text-[#B0B0B0] bg-[#B0B0B0]/10"}`}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {data?.status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <DeleteModal btn="btn" id={data?.id} message="Approve" type="booking" bookAction="ACCEPTED" />
            <DeleteModal btn="btn" id={data?.id} message="Reject" type="booking" bookAction="REJECTED" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
