"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Settings,
  CalendarRange,
  Users,
  CalendarCheck2,
  MessageCircle,
  LogOut,
  Home,
  MapPin,
  Building,
  TrendingUp,
  Shield,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { logout, selectCurrentUser } from "@/redux/features/auth/authSlice";
import { removeCookie } from "@/utils/cookies";
import Link from "next/link";
import Image from "next/image";

const admin = [
  {
    title: "Overview",
    url: "/",
    icon: Home,
  },
  {
    title: "Venues",
    url: "/venues",
    icon: MapPin,
  },
  {
    title: "Events",
    url: "/event",
    icon: CalendarRange,
  },
  {
    title: "Bookings",
    url: "/bookings",
    icon: CalendarCheck2,
  },
  {
    title: "Approvals",
    url: "/approvals",
    icon: Shield,
  },
  {
    title: "Attribution",
    url: "/analytics",
    icon: TrendingUp,
  },
  {
    title: "Users",
    url: "/user",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

const club = [
  {
    title: "Dashboard",
    url: "/club",
    icon: Home,
  },
  {
    title: "My Venue Profile",
    url: "/club/venue",
    icon: Building,
  },
  {
    title: "Events",
    url: "/club/events",
    icon: CalendarRange,
  },
  {
    title: "Bookings",
    url: "/club/bookings",
    icon: CalendarCheck2,
  },
  {
    title: "Attribution",
    url: "/analytics",
    icon: TrendingUp,
  },
  {
    title: "Settings",
    url: "/club/settings",
    icon: Settings,
  },
];

const SideBar = () => {
  const pathName = usePathname();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector(selectCurrentUser);

  const handleLogout = () => {
    dispatch(logout());
    removeCookie("token");
    router.push("/login");
  };

  const navLinks = user?.role === "ADMIN" ? admin : club;

  return (
    <Sidebar className="border-r border-[#2A2A2A] bg-[#000000]">
      <SidebarContent className="bg-[#000000]">
        {/* Brand header — plain div, NOT SidebarGroupLabel. The shadcn label
            component has a constrained height which made the PARTNER pill
            overflow onto the first nav item. A regular div lets the header
            grow to fit the logo + optional partner tag without bleed. */}
        <div className="mt-8 mb-8 mx-auto flex flex-col items-center gap-3 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo_primary_dark.jpg"
            alt="Pink Pineapple"
            width={180}
            height={60}
            style={{ objectFit: 'contain' }}
          />
          {user?.role === "CLUB" && (
            <span
              className="text-[10px] tracking-[0.4em] px-3 py-1 rounded-full"
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

        <SidebarGroupContent>
          <SidebarMenu className="px-3 space-y-1">
            {navLinks.map((item) => {
              const isActive = pathName === item.url;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`
                      relative font-normal text-sm rounded-xl px-4 py-3 transition-all duration-200
                      ${isActive
                        ? "text-[#FFFFFF] font-medium"
                        : "text-[#6B6B6B] hover:text-[#FFFFFF] hover:bg-[#1A1A1A]"
                      }
                    `}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
                    } : {}}
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon size={16} />
                      <span style={{ fontFamily: 'Inter, sans-serif' }}>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarContent>

      <SidebarFooter className="bg-[#000000] border-t border-[#2A2A2A] p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#2A2A2A] text-[#6B6B6B] hover:text-[#FFFFFF] hover:border-[#2A2A2A] transition-all duration-200 text-sm"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default SideBar;
