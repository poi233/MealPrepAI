export default function ProfileLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded-md w-48 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded-md w-64 animate-pulse"></div>
      </div>

      <div className="space-y-6">
        {/* Tabs skeleton */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <div className="h-10 bg-gray-200 rounded-md flex-1 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-md flex-1 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-md flex-1 animate-pulse"></div>
        </div>

        {/* Card skeleton */}
        <div className="border rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded-md w-32 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded-md w-48 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded-md w-20 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded-md w-24 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded-md w-20 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded-md animate-pulse"></div>
          </div>
        </div>

        {/* Save button skeleton */}
        <div className="flex justify-end pt-6">
          <div className="h-10 bg-gray-200 rounded-md w-32 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}