import Navbar from "@/components/shared/Navbar";
import SideBar from "@/components/shared/SideBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pink Pineapple",
  description: "Luxury venue management for Bali's finest experiences",
};

const CommonLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <SideBar />
      <main className="w-full bg-[#000000]">
        <div className="max-w-[1500px] mx-auto md:py-5 md:px-0 px-3">
          <Navbar />
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
};

export default CommonLayout;
