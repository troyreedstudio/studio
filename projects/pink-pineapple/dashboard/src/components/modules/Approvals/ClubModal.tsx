"use client";
import DeleteModal from "@/components/common/DeleteModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSingleUserQuery } from "@/redux/features/user/user.api";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

const poppins = { fontFamily: "Poppins, sans-serif" };
const garamond = { fontFamily: "Cormorant Garamond, serif" };

const ClubModal = ({ id, status }: { id: string; status: "CLUB" | "USER" }) => {
  const { data, isLoading } = useSingleUserQuery(id);
  const userData = data?.data?.userProfile;

  const formatDate = (dateStr?: string) => {
    return dateStr ? new Date(dateStr).toLocaleDateString() : "N/A";
  };

  return (
    <Dialog>
      <DialogTrigger
        className="inline-block px-4 py-2 rounded-lg text-xs font-semibold text-[#000000] tracking-wide transition-all duration-200 hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
          ...poppins,
        }}
      >
        View Details
      </DialogTrigger>

      <DialogContent className="max-w-lg sm:max-w-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <DialogHeader>
          <DialogTitle
            className="text-lg font-semibold text-[#FFFFFF]"
            style={garamond}
          >
            Partner Profile
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 mt-2">
            <div className="flex gap-6">
              <Skeleton className="w-28 h-28 rounded-full bg-[#1A1A1A]" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-40 bg-[#1A1A1A] rounded" />
                <Skeleton className="h-3 w-full bg-[#1A1A1A] rounded" />
                <Skeleton className="h-3 w-3/4 bg-[#1A1A1A] rounded" />
                <Skeleton className="h-3 w-1/2 bg-[#1A1A1A] rounded" />
              </div>
            </div>
          </div>
        ) : userData ? (
          <div className="flex flex-col sm:flex-row gap-6 mt-2">
            {/* Profile Image */}
            <div className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border border-[#2A2A2A] bg-[#000000]">
              {userData.profileImage ? (
                <Image
                  src={userData.profileImage || "/placeholders/image_placeholder.png"}
                  alt={userData.fullName}
                  width={112}
                  height={112}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-[#C4707E] font-bold text-2xl" style={garamond}>
                  {userData.fullName?.charAt(0) || "U"}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#FFFFFF]" style={poppins}>
                  {userData.fullName || "N/A"}
                </h2>
                {userData.status && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                      ${userData.status === "PENDING"
                        ? "text-yellow-400 bg-yellow-400/10"
                        : userData.status === "ACTIVE"
                        ? "text-emerald-400 bg-emerald-400/10"
                        : "text-red-400 bg-red-400/10"
                      }`}
                    style={poppins}
                  >
                    {userData.status}
                  </span>
                )}
              </div>

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {[
                { label: "Email", value: userData.email },
                userData.phoneNumber && { label: "Phone", value: userData.phoneNumber },
                { label: "DOB", value: formatDate(userData.dob) },
                ...(status === "USER" ? [
                  { label: "Profile Complete", value: userData.isCompleteProfile ? "Yes" : "No" },
                  { label: "Privacy", value: userData.profilePrivacy || "N/A" },
                  userData.fullAddress && { label: "Address", value: userData.fullAddress },
                  userData.bio && { label: "Bio", value: userData.bio },
                ] : [
                  { label: "Type of Venue", value: userData.typeOfVenue || "N/A" },
                  { label: "Tax ID", value: userData.taxId || "N/A" },
                ]),
                { label: "Member Since", value: formatDate(userData.createdAt) },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ].filter(Boolean).map(({ label, value }: any) => (
                <div key={label} className="flex gap-2">
                  <span className="text-xs text-[#B0B0B0] min-w-[110px]" style={poppins}>{label}:</span>
                  <span className="text-xs text-[#FFFFFF]" style={poppins}>{value}</span>
                </div>
              ))}

              {status === "CLUB" && userData.businessLicense && (
                <div className="mt-2">
                  <p className="text-xs text-[#B0B0B0] mb-2" style={poppins}>Business License</p>
                  <Image
                    src={userData.businessLicense || "/placeholders/image_placeholder.png"}
                    alt="Business License"
                    width={300}
                    height={200}
                    className="object-cover w-full h-40 rounded-lg border border-[#2A2A2A]"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <p className="text-[#B0B0B0] text-sm" style={poppins}>No data available</p>
            </div>
          </div>
        )}

        {/* Prominent Approve/Reject Buttons */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-[#2A2A2A]">
          <div className="flex-1">
            <DeleteModal btn="approve" id={userData?.id} type="approve" message="Approve" approveAction="ACTIVE" />
          </div>
          <div className="flex-1">
            <DeleteModal btn="btn" id={userData?.id} type="approve" message="Reject" approveAction="INACTIVE" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClubModal;
