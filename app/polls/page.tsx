import Link from "next/link";
import ProtectedRoute from "@/components/ui/ProtectedRoute";

export default function PollsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Polls Dashboard
            </h1>
            <p className="mt-2 text-gray-600">Create and manage your polls</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Welcome to your Polls Dashboard
              </h2>
              <p className="text-gray-600 mb-8">
                Get started by creating your first poll
              </p>
              <Link
                href="/polls/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Create Poll
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
