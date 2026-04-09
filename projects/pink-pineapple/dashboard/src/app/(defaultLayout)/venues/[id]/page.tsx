/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useParams } from "next/navigation";
import { useSingleUserQuery } from "@/redux/features/user/user.api";
import { useAllEventsQuery } from "@/redux/features/events/events.spi";
import Spinner from "@/components/common/Spinner";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, Clock } from "lucide-react";

const poppins = { fontFamily: "Poppins, sans-serif" };
const garamond = { fontFamily: "Cormorant Garamond, serif" };

const VenueDetailPage = () => {
  const params = useParams();
  const id = params?.id as string;

  const { data, isLoading } = useSingleUserQuery(id);
  const venue = data?.data?.userProfile;

  const { data: eventsData, isLoading: eventsLoading } = useAllEventsQuery([
    { name: "limit", value: 10 },
    { name: "page", value: "1" },
    { name: "clubId", value: id },
  ]);

  const events = eventsData?.data?.data;

  if (isLoading) {
    return <Spinner />;
  }

  if (!venue) {
    return (
      <div className="py-16 text-center">
        <p className="text-[#B0B0B0] text-sm" style={poppins}>
          Venue not found.
        </p>
        <Link
          href="/venues"
          className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-medium text-[#000000] transition-all duration-200 hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
            ...poppins,
          }}
        >
          Back to Venues
        </Link>
      </div>
    );
  }

  const infoRows = [
    { label: "Email", value: venue.email },
    venue.phoneNumber && { label: "Phone", value: venue.phoneNumber },
    { label: "Type of Venue", value: venue.typeOfVenue || "N/A" },
    { label: "Tax ID", value: venue.taxId || "N/A" },
    venue.fullAddress && { label: "Address", value: venue.fullAddress },
    venue.bio && { label: "Bio", value: venue.bio },
    {
      label: "Status",
      value: venue.status || "N/A",
    },
    {
      label: "Approved",
      value: venue.isApproved ? "Yes" : "No",
    },
    {
      label: "Member Since",
      value: venue.createdAt
        ? new Date(venue.createdAt).toLocaleDateString()
        : "N/A",
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/venues"
        className="inline-flex items-center gap-2 text-[#B0B0B0] hover:text-[#FFFFFF] transition-colors text-sm"
        style={poppins}
      >
        <ArrowLeft size={16} />
        Back to Venues
      </Link>

      {/* Profile Card */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border border-[#2A2A2A] bg-[#1A1A1A]">
            {venue.profileImage ? (
              <Image
                src={venue.profileImage}
                alt={venue.fullName || "Venue"}
                width={112}
                height={112}
                className="object-cover w-full h-full"
              />
            ) : (
              <div
                className="flex items-center justify-center w-full h-full text-[#C4707E] font-bold text-2xl"
                style={garamond}
              >
                {venue.fullName?.charAt(0) || "V"}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <h1
                className="md:text-3xl text-2xl font-semibold text-[#FFFFFF]"
                style={{ ...garamond, letterSpacing: "0.02em" }}
              >
                {venue.fullName || "N/A"}
              </h1>
              {venue.status && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    venue.status === "ACTIVE"
                      ? "text-emerald-400 bg-emerald-400/10"
                      : venue.status === "PENDING"
                      ? "text-yellow-400 bg-yellow-400/10"
                      : "text-red-400 bg-red-400/10"
                  }`}
                  style={poppins}
                >
                  {venue.status}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {infoRows.map(({ label, value }) => (
                <div key={label} className="flex gap-2">
                  <span
                    className="text-xs text-[#B0B0B0] min-w-[110px]"
                    style={poppins}
                  >
                    {label}:
                  </span>
                  <span className="text-xs text-[#FFFFFF]" style={poppins}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Business License */}
        {venue.businessLicense && (
          <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
            <p className="text-xs text-[#B0B0B0] mb-3" style={poppins}>
              Business License
            </p>
            <Image
              src={venue.businessLicense}
              alt="Business License"
              width={400}
              height={250}
              className="object-cover max-w-md w-full h-48 rounded-lg border border-[#2A2A2A]"
            />
          </div>
        )}

        {/* Availability */}
        {venue.availability && venue.availability.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
            <h3
              className="text-lg font-semibold text-[#FFFFFF] mb-4"
              style={garamond}
            >
              Availability Schedule
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {venue.availability.map((slot: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]"
                >
                  <Clock size={14} className="text-[#C4707E] flex-shrink-0" />
                  <div>
                    <p
                      className="text-xs font-medium text-[#FFFFFF]"
                      style={poppins}
                    >
                      {slot.day || slot.dayName || `Day ${i + 1}`}
                    </p>
                    {(slot.openTime || slot.closeTime) && (
                      <p
                        className="text-[10px] text-[#B0B0B0]"
                        style={poppins}
                      >
                        {slot.openTime || "N/A"} - {slot.closeTime || "N/A"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Events Section */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#000000] p-6 sm:p-8">
        <h3
          className="text-lg font-semibold text-[#FFFFFF] mb-5"
          style={garamond}
        >
          Venue Events
        </h3>

        {eventsLoading ? (
          <Spinner />
        ) : events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event: any) => (
              <Link
                key={event?.id || event?._id}
                href={`/event/${event?.id || event?._id}`}
                className="flex items-center justify-between px-5 py-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="flex items-center gap-4">
                  {event?.eventImages?.[0] ? (
                    <Image
                      src={event.eventImages[0]}
                      alt={event.eventName}
                      width={44}
                      height={44}
                      className="w-11 h-11 rounded-lg object-cover border border-[#2A2A2A] flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-lg bg-[#000000] border border-[#2A2A2A] flex items-center justify-center text-[#C4707E] text-xs flex-shrink-0"
                      style={garamond}
                    >
                      PP
                    </div>
                  )}
                  <div>
                    <p
                      className="text-sm font-medium text-[#FFFFFF]"
                      style={poppins}
                    >
                      {event?.eventName}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-[#B0B0B0]" style={poppins}>
                        <Calendar size={10} />
                        {new Date(event?.startDate).toLocaleDateString()}
                      </span>
                      {event?.fullAddress && (
                        <span className="flex items-center gap-1 text-[10px] text-[#B0B0B0]" style={poppins}>
                          <MapPin size={10} />
                          {event.fullAddress}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    event?.eventStatus === "APPROVED"
                      ? "text-emerald-400 bg-emerald-400/10"
                      : event?.eventStatus === "PENDING"
                      ? "text-yellow-400 bg-yellow-400/10"
                      : event?.eventStatus === "REJECTED"
                      ? "text-red-400 bg-red-400/10"
                      : "text-[#B0B0B0] bg-[#B0B0B0]/10"
                  }`}
                  style={poppins}
                >
                  {event?.eventStatus}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <Calendar size={24} className="text-[#6B6B6B]" />
              <p className="text-[#B0B0B0] text-sm" style={poppins}>
                No events for this venue yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueDetailPage;
