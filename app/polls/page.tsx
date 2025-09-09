import Link from "next/link";

// Mock polls data
const mockPolls = [
  {
    id: "1",
    title: "What's your favorite programming language?",
    description: "Help us understand the community's preferences.",
  },
  {
    id: "2",
    title: "Best time for team meetings?",
    description: "Choose your preferred meeting time.",
  },
];

export default function PollsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Polls Dashboard</h1>
          <p className="mt-2 text-gray-600">Create and manage your polls</p>
        </div>

        <div className="mb-6">
          <Link
            href="/polls/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Create New Poll
          </Link>
        </div>

        <div className="space-y-4">
          {mockPolls.map((poll) => (
            <div key={poll.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {poll.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{poll.description}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Link
                  href={`/polls/${poll.id}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  View Poll
                </Link>
              </div>
            </div>
          ))}
        </div>

        {mockPolls.length === 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                No polls yet
              </h2>
              <p className="text-gray-600 mb-8">
                Get started by creating your first poll
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
