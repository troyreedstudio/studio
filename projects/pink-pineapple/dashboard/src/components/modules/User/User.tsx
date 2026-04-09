/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo } from "react";
import Spinner from "@/components/common/Spinner";
import { useAllUserQuery } from "@/redux/features/user/user.api";
import Image from "next/image";
import Pagination from "@/components/common/Pagination";
import DetailsModal from "./DetailsModal";

const poppins = { fontFamily: "Poppins, sans-serif" };
const garamond = { fontFamily: "Cormorant Garamond, serif" };

const roleBadge = (role: string) => {
  const map: Record<string, { label: string; classes: string }> = {
    USER: { label: "User", classes: "text-blue-400 bg-blue-400/10" },
    CLUB: { label: "Venue", classes: "text-[#C4707E] bg-[#C4707E]/10" },
    ADMIN: { label: "Admin", classes: "text-emerald-400 bg-emerald-400/10" },
  };
  return map[role] || { label: role, classes: "text-[#B0B0B0] bg-[#B0B0B0]/10" };
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: "text-emerald-400 bg-emerald-400/10",
    PENDING: "text-yellow-400 bg-yellow-400/10",
    INACTIVE: "text-red-400 bg-red-400/10",
    BLOCKED: "text-red-400 bg-red-400/10",
  };
  return map[status] || "text-[#B0B0B0] bg-[#B0B0B0]/10";
};

const User = () => {
  const [status, setStatus] = useState<"USER" | "CLUB">("USER");
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");

  const {
    data,
    isLoading,
    status: state,
  } = useAllUserQuery([
    { name: "limit", value: 15 },
    { name: "page", value: String(currentPage) },
    ...(status ? [{ name: "role", value: status }] : []),
  ]);

  const users = data?.data?.data;

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (item: any) =>
        item?.fullName?.toLowerCase().includes(q) ||
        item?.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

  if (isLoading || state === "pending") {
    return <Spinner />;
  }

  const metaData = data?.data?.meta;

  const tabs: { label: string; value: "CLUB" | "USER" }[] = [
    { label: "Users", value: "USER" },
    { label: "Clubs", value: "CLUB" },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs + Search */}
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
              {tab.label}
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
            placeholder={`Search ${status === "USER" ? "users" : "clubs"}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#000000] text-[#FFFFFF] text-sm placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#C4707E]/50 transition-colors w-full sm:w-64"
            style={poppins}
          />
        </div>
      </div>

      {/* User list */}
      <div className="space-y-2">
        {filteredUsers?.map((item: any) => {
          const role = roleBadge(item?.role || status);
          return (
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium text-[#FFFFFF]" style={poppins}>
                      {item?.fullName}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${role.classes}`}
                      style={poppins}
                    >
                      {role.label}
                    </span>
                    {item?.status && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge(item.status)}`}
                        style={poppins}
                      >
                        {item.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#B0B0B0] mt-0.5" style={poppins}>
                    {item?.email}
                  </p>
                  <p className="text-[10px] text-[#6B6B6B] mt-0.5" style={poppins}>
                    Joined {new Date(item?.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <DetailsModal id={item?.id} status={status} />
            </div>
          );
        })}
      </div>

      {filteredUsers?.length < 1 && (
        <div className="py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="1.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-[#B0B0B0] text-sm" style={poppins}>
              {search
                ? `No ${status === "USER" ? "users" : "clubs"} matching "${search}"`
                : `No ${status === "USER" ? "users" : "clubs"} found.`}
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

export default User;
