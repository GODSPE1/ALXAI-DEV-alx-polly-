import {
  createPollFromData,
  voteOnPollAction,
  deletePollAction,
  getPollResultsAction,
} from "../lib/poll-actions";
import { pollsDb, votesDb } from "../lib/database/polls";
import { revalidatePath } from "next/cache";
import {
  createMockPoll,
  createMockVote,
  createMockFormData,
  createMockSuccessResponse,
  createMockErrorResponse,
} from "./test-utils";

// Mock the database modules
jest.mock("../lib/database/polls", () => ({
  pollsDb: {
    create: jest.fn(),
    delete: jest.fn(),
    getResults: jest.fn(),
  },
  votesDb: {
    create: jest.fn(),
    hasUserVoted: jest.fn(),
  },
}));

// Mock Next.js modules
jest.mock("next/cache");
jest.mock("next/navigation");

// Type-safe mocks
const mockedPollsDb = pollsDb as jest.Mocked<typeof pollsDb>;
const mockedVotesDb = votesDb as jest.Mocked<typeof votesDb>;
const mockedRevalidatePath = revalidatePath as jest.Mock;

describe("Poll Actions - Integration Scenarios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow voting on a successfully created poll", async () => {
    // --- Step 1: Create the Poll ---
    const mockPoll = createMockPoll({ title: "Integration Test Poll" });
    const pollInput = {
      title: mockPoll.title,
      options: mockPoll.options.map((o) => o.option_text),
    };
    const userId = "user_integration_test";

    mockedPollsDb.create.mockResolvedValue(createMockSuccessResponse(mockPoll));

    const createdPoll = await createPollFromData(pollInput, userId);

    expect(mockedPollsDb.create).toHaveBeenCalledWith(pollInput, userId);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/polls");
    expect(createdPoll).toEqual(mockPoll);

    // --- Step 2: Vote on the Poll ---
    const optionToVoteOn = mockPoll.options[0];
    const voteFormData = createMockFormData({
      poll_id: mockPoll.id,
      option_id: optionToVoteOn.id,
      user_id: userId,
    });
    const mockVote = createMockVote({
      poll_id: mockPoll.id,
      option_id: optionToVoteOn.id,
      user_id: userId,
    });

    // Mock the voting process checks
    mockedVotesDb.hasUserVoted.mockResolvedValue(
      createMockSuccessResponse(false),
    );
    mockedVotesDb.create.mockResolvedValue(createMockSuccessResponse(mockVote));

    const voteResult = await voteOnPollAction(voteFormData);

    expect(mockedVotesDb.hasUserVoted).toHaveBeenCalledWith(
      mockPoll.id,
      userId,
    );
    expect(mockedVotesDb.create).toHaveBeenCalledWith(
      expect.objectContaining({
        poll_id: mockPoll.id,
        option_id: optionToVoteOn.id,
      }),
    );
    // Revalidation for the specific poll and the general polls list
    expect(mockedRevalidatePath).toHaveBeenCalledWith(`/polls/${mockPoll.id}`);
    expect(mockedRevalidatePath).toHaveBeenCalledTimes(3); // 1 from create, 2 from vote
    expect(voteResult).toEqual(mockVote);
  });

  it("should reflect a new vote in the poll results", async () => {
    // --- Setup ---
    const mockPoll = createMockPoll();
    const optionToVoteOn = mockPoll.options[1];
    const userId = "user_results_test";

    // --- Step 1: Simulate the vote ---
    const voteFormData = createMockFormData({
      poll_id: mockPoll.id,
      option_id: optionToVoteOn.id,
      user_id: userId,
    });
    mockedVotesDb.hasUserVoted.mockResolvedValue(
      createMockSuccessResponse(false),
    );
    mockedVotesDb.create.mockResolvedValue(
      createMockSuccessResponse(createMockVote()),
    );

    await voteOnPollAction(voteFormData);

    // --- Step 2: Fetch and verify results ---
    const mockResults = {
      poll: { ...mockPoll, total_votes: 1 },
      options: [
        { ...mockPoll.options[0], vote_count: 0, vote_percentage: 0 },
        { ...mockPoll.options[1], vote_count: 1, vote_percentage: 100 },
      ],
      total_votes: 1,
    };
    mockedPollsDb.getResults.mockResolvedValue(
      createMockSuccessResponse(mockResults as any),
    );

    const results = await getPollResultsAction(mockPoll.id);

    expect(mockedPollsDb.getResults).toHaveBeenCalledWith(mockPoll.id);
    expect(results).toBeDefined();
    expect(results!.total_votes).toBe(1);
    expect(results!.options[1].vote_count).toBe(1);
    expect(results!.options[1].vote_percentage).toBe(100);
    expect(results!.options[0].vote_count).toBe(0);
  });

  it("should prevent fetching results for a deleted poll", async () => {
    const pollIdToDelete = "poll_to_be_deleted_123";

    // --- Step 1: Delete the poll ---
    mockedPollsDb.delete.mockResolvedValue(
      createMockSuccessResponse(undefined),
    );

    const deleteResult = await deletePollAction(pollIdToDelete);

    expect(mockedPollsDb.delete).toHaveBeenCalledWith(pollIdToDelete);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/polls");
    expect(deleteResult.success).toBe(true);

    // --- Step 2: Attempt to fetch its results ---
    const errorMessage = "Poll not found";
    mockedPollsDb.getResults.mockResolvedValue(
      createMockErrorResponse(errorMessage),
    );

    // The action is designed to throw an error on failure
    await expect(getPollResultsAction(pollIdToDelete)).rejects.toThrow(
      errorMessage,
    );
    expect(mockedPollsDb.getResults).toHaveBeenCalledWith(pollIdToDelete);
  });

  it("should throw an error when trying to vote a second time", async () => {
    const pollId = "poll_multi_vote_prevent";
    const userId = "user_multi_voter";
    const voteFormData = createMockFormData({
      poll_id: pollId,
      option_id: "option_abc",
      user_id: userId,
    });

    // Mock the check to return that the user has already voted
    mockedVotesDb.hasUserVoted.mockResolvedValue(
      createMockSuccessResponse(true),
    );

    await expect(voteOnPollAction(voteFormData)).rejects.toThrow(
      "You have already voted on this poll",
    );

    // Ensure that the database `create` was never attempted
    expect(mockedVotesDb.create).not.toHaveBeenCalled();
    // Ensure no revalidation happened
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});
