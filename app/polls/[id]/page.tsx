"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// Simple mock poll data
const mockPolls = {
  "1": {
    id: "1",
    title: "What's your favorite programming language?",
    description: "Help us understand the community's preferences.",
    options: [
      { id: "1a", text: "JavaScript" },
      { id: "1b", text: "Python" },
      { id: "1c", text: "TypeScript" },
      { id: "1d", text: "Go" },
    ],
  },
  "2": {
    id: "2",
    title: "Best time for team meetings?",
    description: "Choose your preferred meeting time.",
    options: [
      { id: "2a", text: "9:00 AM" },
      { id: "2b", text: "10:00 AM" },
      { id: "2c", text: "2:00 PM" },
      { id: "2d", text: "3:00 PM" },
    ],
  },
};

export default function PollDetailPage() {
  const params = useParams();
  const pollId = params.id as string;
  const [selectedOption, setSelectedOption] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const poll = mockPolls[pollId as keyof typeof mockPolls];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setHasVoted(true);
    setIsSubmitting(false);
  };

  if (!poll) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Poll Not Found
            </h1>
            <Link href="/polls" className="text-blue-600 hover:text-blue-800">
              ← Back to Polls
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/polls"
          className="text-blue-600 hover:text-blue-800 mb-6 inline-block"
        >
          ← Back to Polls
        </Link>

        <div className="bg-white rounded-lg shadow p-8">
          {/* Poll Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {poll.title}
            </h1>
            <p className="text-gray-600 text-lg">{poll.description}</p>
          </div>

          {/* Thank You Message */}
          {hasVoted && (
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Thank you for voting!
              </h2>
              <p className="text-gray-600 mb-8">
                Your vote has been recorded successfully.
              </p>
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Poll Results
                </h3>
                <p className="text-gray-600">
                  Results will be available after the poll closes.
                </p>
              </div>
            </div>
          )}

          {/* Voting Form */}
          {!hasVoted && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 mb-8">
                {poll.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="poll-option"
                      value={option.id}
                      checked={selectedOption === option.id}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      className="w-5 h-5 text-blue-600 mr-4"
                    />
                    <span className="text-lg font-medium text-gray-900">
                      {option.text}
                    </span>
                  </label>
                ))}
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  disabled={!selectedOption || isSubmitting}
                  className={`px-8 py-3 rounded-lg font-medium text-white transition-colors ${
                    !selectedOption || isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Vote"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
