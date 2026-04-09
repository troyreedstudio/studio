import User from '@/components/modules/User/User';

const page = () => {
  return (
    <div>
      <div className="mb-8">
        <h1
          className="md:text-3xl text-2xl font-semibold text-[#FFFFFF]"
          style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.02em' }}
        >
          Users &amp; Clubs
        </h1>
        <p
          className="text-[#B0B0B0] text-sm mt-1"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Manage registered users and venue partners
        </p>
      </div>
      <User />
    </div>
  );
};

export default page;