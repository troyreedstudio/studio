const Pagination = ({
  currentPage,
  totalItem,
  limit,
  onPageChange,
}: {
  currentPage: number;
  totalItem: number;
  limit: number;
  onPageChange: (page: number) => void;
}) => {
  const totalPage = Math.ceil(totalItem / limit);
  const pageNumbers = [];

  for (let i = 1; i <= totalPage; i++) {
    pageNumbers.push(i);
  }

  const btnBase = "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200";

  return (
    <div className="flex justify-center items-center mt-8 mb-4 gap-2">
      <button
        className={`${btnBase} border border-[#2A2A2A] text-[#B0B0B0] hover:text-[#FFFFFF] hover:border-[#3A3A3A] disabled:opacity-40 disabled:cursor-not-allowed`}
        style={{ fontFamily: 'Poppins, sans-serif' }}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ← Prev
      </button>

      {pageNumbers?.map((num) => (
        <button
          key={num}
          className={`${btnBase} ${
            currentPage === num
              ? "text-[#000000] font-semibold"
              : "border border-[#2A2A2A] text-[#B0B0B0] hover:text-[#FFFFFF] hover:border-[#3A3A3A]"
          }`}
          style={
            currentPage === num
              ? {
                  background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
                  fontFamily: 'Poppins, sans-serif',
                }
              : { fontFamily: 'Poppins, sans-serif' }
          }
          onClick={() => onPageChange(num)}
        >
          {num}
        </button>
      ))}

      <button
        className={`${btnBase} border border-[#2A2A2A] text-[#B0B0B0] hover:text-[#FFFFFF] hover:border-[#3A3A3A] disabled:opacity-40 disabled:cursor-not-allowed`}
        style={{ fontFamily: 'Poppins, sans-serif' }}
        disabled={currentPage === totalPage}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next →
      </button>
    </div>
  );
};

export default Pagination;
