export function Loader({ isLoading, message = 'Processing...' }) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-600 animate-spin"></div>
        </div>
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
}

export function InlineLoader({ isLoading, size = 'sm' }) {
  if (!isLoading) return null;

  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3'
  };

  return (
    <div className={`inline-block rounded-full border-gray-300 border-transparent border-t-blue-600 border-r-blue-600 animate-spin ${sizeClasses[size]}`}></div>
  );
}
