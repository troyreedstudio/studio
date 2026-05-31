import SendNotification from "@/components/modules/Notifications/SendNotification";

const page = () => {
  return (
    <div>
      <h1
        className="md:text-3xl text-2xl font-semibold mb-2 text-[#FFFFFF]"
        style={{ fontFamily: "Outfit, sans-serif", letterSpacing: "0.02em" }}
      >
        Send Notification
      </h1>
      <p
        className="text-sm text-[#B0B0B0] mb-6"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        Push a message straight to every Pink Pineapple user with the app installed.
      </p>
      <SendNotification />
    </div>
  );
};

export default page;
