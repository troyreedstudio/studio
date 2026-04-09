"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSingleUserQuery } from "@/redux/features/user/user.api";
import Image from "next/image";

const DetailsModal = ({ id, status }: { id: string; status: "CLUB" | "USER" }) => {
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
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        View Details
      </DialogTrigger>

      <DialogContent className="max-w-lg sm:max-w-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <DialogHeader>
          <DialogTitle
            className="text-lg font-semibold text-[#FFFFFF]"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            {status === "USER" ? "User Profile" : "Club Profile"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-center py-8 text-[#B0B0B0]"
            style={{ fontFamily: 'Poppins, sans-serif' }}>Loading...</p>
        ) : userData ? (
          <div className="flex flex-col sm:flex-row gap-6 mt-2">
            {/* Avatar */}
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
                <div className="flex items-center justify-center w-full h-full text-[#C4707E] font-bold text-2xl"
                  style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {userData.fullName?.charAt(0) || "U"}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col gap-2.5">
              <h2 className="text-base font-semibold text-[#FFFFFF]"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                {userData.fullName || "N/A"}
              </h2>

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
                { label: "Status", value: userData.status },
                { label: "Member Since", value: formatDate(userData.createdAt) },
              ].filter(Boolean).map(({ label, value }: any) => (
                <div key={label} className="flex gap-2">
                  <span className="text-xs text-[#B0B0B0] min-w-[120px]"
                    style={{ fontFamily: 'Poppins, sans-serif' }}>{label}:</span>
                  <span className="text-xs text-[#FFFFFF]"
                    style={{ fontFamily: 'Poppins, sans-serif' }}>{value}</span>
                </div>
              ))}

              {status === "CLUB" && userData.businessLicense && (
                <div className="mt-2">
                  <p className="text-xs text-[#B0B0B0] mb-2"
                    style={{ fontFamily: 'Poppins, sans-serif' }}>Business License</p>
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
          <p className="text-center py-8 text-[#B0B0B0]"
            style={{ fontFamily: 'Poppins, sans-serif' }}>No data available</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DetailsModal;
