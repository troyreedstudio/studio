/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Image from "next/image";
import { useSingleEventQuery } from "@/redux/features/events/events.spi";
import DeleteModal from "@/components/common/DeleteModal";
import Spinner from "@/components/common/Spinner";
import { useParams } from "next/navigation";

const SingleEvent = () => {
  const { id } = useParams();
  const { data, isLoading, error } = useSingleEventQuery(id);

  if (isLoading) return <Spinner />;
  if (error) return (
    <div className="py-16 text-center text-[#B0B0B0]" style={{ fontFamily: 'Poppins, sans-serif' }}>
      Failed to load event details.
    </div>
  );

  const event = data?.data;

  if (!event) return (
    <div className="py-16 text-center text-[#B0B0B0]" style={{ fontFamily: 'Poppins, sans-serif' }}>
      No event found.
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1
          className="text-3xl font-semibold text-[#FFFFFF]"
          style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.03em' }}
        >
          {event.eventName}
        </h1>
        <p className="text-[#B0B0B0] text-sm leading-relaxed"
          style={{ fontFamily: 'Poppins, sans-serif' }}>
          {event.descriptions}
        </p>
        <span
          className={`inline-block text-xs px-3 py-1 rounded-full font-medium mt-1
            ${event.eventStatus === "APPROVED"
              ? "text-emerald-400 bg-emerald-400/10"
              : event.eventStatus === "PENDING"
              ? "text-yellow-400 bg-yellow-400/10"
              : "text-red-400 bg-red-400/10"
            }`}
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          {event.eventStatus}
        </span>
      </div>

      {/* Event Images */}
      {event.eventImages?.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {event.eventImages?.map((img: string, i: number) => (
            <Image
              key={i}
              src={img}
              alt={`Event image ${i + 1}`}
              width={600}
              height={400}
              className="w-full h-64 object-cover rounded-xl border border-[#2A2A2A]"
            />
          ))}
        </div>
      )}

      {/* Dates */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 grid md:grid-cols-2 gap-4">
        {[
          { label: "Start", value: `${new Date(event.startDate).toLocaleString()} (${event.startTime})` },
          { label: "End", value: `${new Date(event.endDate).toLocaleString()} (${event.endTime})` },
          { label: "Last Registration", value: `${new Date(event.lastRegDate).toLocaleString()} (${event.lastRegTime})` },
          { label: "Arrive Time", value: `${new Date(event.arriveDate).toLocaleString()} (${event.arriveTime})` },
          { label: "Additional Guests", value: event.additionalGuests },
          { label: "Extra Requirements", value: event.extraRequirements },
        ].map(({ label, value }) => (
          <div key={label} className="space-y-1">
            <p className="text-xs text-[#B0B0B0] uppercase tracking-widest"
              style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</p>
            <p className="text-sm text-[#FFFFFF]"
              style={{ fontFamily: 'Poppins, sans-serif' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tickets */}
      <div className="space-y-4">
        <h2
          className="text-2xl font-semibold text-[#FFFFFF]"
          style={{ fontFamily: 'Cormorant Garamond, serif' }}
        >
          Tickets
        </h2>
        {event.eventTickets?.map((ticket: any) => (
          <div
            key={ticket.id}
            className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-5 space-y-3"
          >
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Male Admission", value: `$${ticket.maleAdmission}` },
                { label: "Female Admission", value: `$${ticket.femaleAdmission}` },
                { label: "Ticket Limit", value: ticket.ticketLimitation },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs text-[#B0B0B0] uppercase tracking-widest"
                    style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</p>
                  <p className="text-sm text-[#FFFFFF]"
                    style={{ fontFamily: 'Poppins, sans-serif' }}>{value}</p>
                </div>
              ))}
            </div>
            {ticket.ticketCharges?.length > 0 && (
              <div>
                <p className="text-xs text-[#B0B0B0] uppercase tracking-widest mb-2"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>Charges</p>
                <ul className="space-y-1">
                  {ticket.ticketCharges.map((charge: any) => (
                    <li key={charge.id} className="text-sm text-[#FFFFFF] flex justify-between"
                      style={{ fontFamily: 'Poppins, sans-serif' }}>
                      <span>{charge.feeName}</span>
                      <span className="text-[#C4707E]">${charge.feeAmount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tables */}
      <div className="space-y-4">
        <h2
          className="text-2xl font-semibold text-[#FFFFFF]"
          style={{ fontFamily: 'Cormorant Garamond, serif' }}
        >
          Tables
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {event.eventTable?.map((table: any) => (
            <div
              key={table.id}
              className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-5 space-y-4"
            >
              <div>
                <h3 className="text-base font-semibold text-[#FFFFFF]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>{table.tableName}</h3>
                <p className="text-xs text-[#B0B0B0] mt-1"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>{table.tableDetails}</p>
              </div>

              {table.tableImages?.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {table.tableImages.map((img: string, i: number) => (
                    <Image
                      key={i}
                      src={img}
                      alt={`Table ${table.tableName} ${i + 1}`}
                      width={300}
                      height={200}
                      className="w-full h-28 object-cover rounded-lg border border-[#2A2A2A]"
                    />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Max Guests", value: table.maxAdditionGuest },
                  { label: "Min Spend", value: `$${table.minimumSpentAmount}` },
                  { label: "F&B Included", value: table.isIncludedFoodBeverage ? "Yes" : "No" },
                ].map(({ label, value }) => (
                  <div key={label} className="space-y-0.5">
                    <p className="text-xs text-[#B0B0B0] uppercase tracking-widest"
                      style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</p>
                    <p className="text-[#FFFFFF]"
                      style={{ fontFamily: 'Poppins, sans-serif' }}>{value}</p>
                  </div>
                ))}
              </div>

              {table.tableCharges?.length > 0 && (
                <div>
                  <p className="text-xs text-[#B0B0B0] uppercase tracking-widest mb-2"
                    style={{ fontFamily: 'Poppins, sans-serif' }}>Charges</p>
                  <ul className="space-y-1">
                    {table.tableCharges.map((charge: any) => (
                      <li key={charge.id} className="text-sm text-[#FFFFFF] flex justify-between"
                        style={{ fontFamily: 'Poppins, sans-serif' }}>
                        <span>{charge.feeName}</span>
                        <span className="text-[#C4707E]">${charge.feeAmount}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 mt-8">
          <DeleteModal id={event?.id} message="Approve" action="APPROVED" type="event" btn="btn" />
          <DeleteModal id={event?.id} message="Reject" action="REJECTED" type="event" btn="btn" />
        </div>
      </div>
    </div>
  );
};

export default SingleEvent;
