import CommonMessage from "@/components/modules/Message/CommonMessage";

const page = () => {
  return (
    <div>
      <h1
        className="md:text-3xl text-2xl font-semibold mb-6 text-[#FFFFFF]"
        style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.02em' }}
      >
        Messages
      </h1>
      <CommonMessage />
    </div>
  );
};

export default page;
