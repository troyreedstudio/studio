"use client";
import Image from "next/image";
import { useGetMeQuery } from "@/redux/features/auth/authApi";
import { useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/redux/features/auth/authSlice";
import { removeCookie } from "@/utils/cookies";
import { LogOut, Settings, CalendarRange, Users, CalendarCheck2, MessageCircle, MapPin } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { HiMenuAlt1 } from "react-icons/hi";
import Link from "next/link";

const Navbar = () => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathName = usePathname();
  const { data } = useGetMeQuery(undefined);
  const userData = data?.data?.userProfile;

  const handleNavLinkClick = () => {
    setIsSheetOpen(false);
  };

  const navLinks = [
    { title: "Overview", url: "/", icon: CalendarRange },
    { title: "Venues", url: "/venues", icon: MapPin },
    { title: "Events", url: "/event", icon: CalendarRange },
    { title: "Bookings", url: "/bookings", icon: CalendarCheck2 },
    { title: "Users", url: "/user", icon: Users },
    { title: "Messages", url: "/club/messages", icon: MessageCircle },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

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
        style={{ fontFamily: 'Playfair Display, serif', letterSpacing: '0.05em' }}
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
            {/* Mobile brand */}
            <div className="mt-6 mb-8 text-center">
              <span
                className="text-lg font-bold text-[#FFFFFF] tracking-widest"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                PINK PINEAPPLE
              </span>
              <p className="text-[#E8A0B0] tracking-[0.5em] text-xs mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                BALI
              </p>
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
