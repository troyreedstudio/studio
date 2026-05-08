"use client";
import Image from "next/image";
import { useGetMeQuery } from "@/redux/features/auth/authApi";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { usePathname, useRouter } from "next/navigation";
import { logout, selectCurrentUser } from "@/redux/features/auth/authSlice";
import { removeCookie } from "@/utils/cookies";
import {
  LogOut,
  Settings,
  CalendarRange,
  Users,
  CalendarCheck2,
  MapPin,
  Home,
  Building,
  TrendingUp,
  Shield,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { HiMenuAlt1 } from "react-icons/hi";
import Link from "next/link";

// Mobile-side nav arrays — kept in sync with SideBar.tsx. If you change one,
// change the other. (Future cleanup: extract into a shared nav config.)
const adminLinks = [
  { title: "Overview", url: "/", icon: Home },
  { title: "Venues", url: "/venues", icon: MapPin },
  { title: "Events", url: "/event", icon: CalendarRange },
  { title: "Bookings", url: "/bookings", icon: CalendarCheck2 },
  { title: "Approvals", url: "/approvals", icon: Shield },
  { title: "Attribution", url: "/analytics", icon: TrendingUp },
  { title: "Users", url: "/user", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

const clubLinks = [
  { title: "Dashboard", url: "/club", icon: Home },
  { title: "My Venue Profile", url: "/club/venue", icon: Building },
  { title: "Events", url: "/club/events", icon: CalendarRange },
  // Bookings tab hidden for now — see SideBar.tsx for rationale.
  { title: "Attribution", url: "/analytics", icon: TrendingUp },
  { title: "Settings", url: "/club/settings", icon: Settings },
];

const Navbar = () => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathName = usePathname();
  const { data } = useGetMeQuery(undefined);
  const userData = data?.data?.userProfile;
  const authUser = useAppSelector(selectCurrentUser);

  const handleNavLinkClick = () => {
    setIsSheetOpen(false);
  };

  // Mirror SideBar.tsx role gating — admins see admin nav, partners see
  // partner nav. Default to partner nav if role is missing/unknown so a
  // venue partner never accidentally lands on admin links they can't access.
  const navLinks = authUser?.role === "ADMIN" ? adminLinks : clubLinks;
  const isPartner = authUser?.role === "CLUB";

  const handleLogout = () => {
    dispatch(logout());
    removeCookie("token");
    router.push("/login");
  };

  // Get page title from path
  const currentPage = navLinks.find(l => l.url === pathName)?.title || "Dashboard";

  return (
    <div
      className="flex items-center justify-between mt-6 mb-8 bg-[#000000] border border-[#2A2A2A] md:px-6 px-4 py-4 rounded-xl"
    >
      {/* Page title */}
      <h2
        className="md:inline-block hidden text-2xl font-bold text-[#FFFFFF]"
        style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em' }}
      >
        {currentPage}
      </h2>

      {/* Mobile menu */}
      <div className="md:hidden">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger>
            <HiMenuAlt1 className="text-2xl cursor-pointer text-[#C4707E]" />
          </SheetTrigger>
          <SheetContent side="left" className="max-w-80 bg-[#000000] border-r border-[#2A2A2A]">
            {/* Mobile brand — adds a "PARTNER" tag for venue partners so
                they immediately know which side of the dashboard they're on,
                matching the desktop SideBar's PARTNER pill. */}
            <div className="mt-6 mb-8 text-center flex flex-col items-center gap-2">
              <span
                className="text-lg font-bold text-[#FFFFFF] tracking-widest"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                PINK PINEAPPLE
              </span>
              <p className="text-[#E8A0B0] tracking-[0.5em] text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                BALI
              </p>
              {isPartner && (
                <span
                  className="text-[10px] tracking-[0.4em] px-2.5 py-0.5 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)",
                    color: "#000000",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                  }}
                >
                  PARTNER
                </span>
              )}
            </div>
            <nav>
              <ul className="space-y-1 flex flex-col">
                {navLinks.map((link) => {
                  const isActive = pathName === link.url;
                  return (
                    <Link
                      key={link.url}
                      href={link.url}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                        isActive
                          ? "text-[#FFFFFF] font-medium"
                          : "text-[#6B6B6B] hover:text-[#FFFFFF] hover:bg-[#1A1A1A]"
                      }`}
                      style={isActive ? {
                        background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
                        fontFamily: 'Inter, sans-serif',
                      } : { fontFamily: 'Inter, sans-serif' }}
                      onClick={handleNavLinkClick}
                    >
                      <link.icon size={16} />
                      {link.title}
                    </Link>
                  );
                })}
              </ul>
            </nav>
            <div className="mt-8">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#2A2A2A] text-[#6B6B6B] hover:text-[#FFFFFF] text-sm transition-all"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* User avatar */}
      <div className="flex gap-3 items-center">
        <div className="text-right">
          <p className="text-sm font-medium text-[#FFFFFF]" style={{ fontFamily: 'Inter, sans-serif' }}>
            {userData?.fullName || "Partner"}
          </p>
          <p className="text-xs text-[#C4707E]" style={{ fontFamily: 'Inter, sans-serif' }}>
            {userData?.role || "Venue"}
          </p>
        </div>
        <div className="relative">
          <Image
            src={userData?.profileImage || "/placeholders/image_placeholder.png"}
            alt="profile"
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover border-2 border-[#2A2A2A]"
          />
          <div className="absolute inset-0 rounded-full border border-[#8B4060]/30" />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
