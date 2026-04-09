import Approvals from "@/components/modules/Approvals/Approvals";

const page = () => {
  return (
    <div>
      <h1
        className="md:text-3xl text-2xl font-semibold mb-6 text-[#FFFFFF]"
        style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.02em' }}
      >
        Approvals
      </h1>
      <Approvals />
    </div>
  );
};

export default page;
