import UserInfo from "@/components/modules/Settings/UserInfo";

const page = () => {
    return (
        <div className='space-y-6'>
            <div className="mb-2">
                <h1
                    className="md:text-3xl text-2xl font-semibold text-[#FFFFFF]"
                    style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.02em' }}
                >
                    Settings
                </h1>
                <p
                    className="text-[#B0B0B0] text-sm mt-1"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                    Manage your profile and account preferences
                </p>
            </div>
            <UserInfo />
        </div>
    );
};

export default page;