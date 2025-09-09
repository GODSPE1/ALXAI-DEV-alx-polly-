import {
  createPollAction,
  createPollFromData,
  voteOnPollAction,
  updatePollAction,
  deletePollAction,
  getPollResultsAction,
  getUserVotesAction,
  checkUserVotedAction,
} from '../lib/poll-actions'
import { pollsDb, votesDb } from '../lib/database/polls'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { CreatePollInput, PollWithOptions } from '../lib/types/database'

// Mock the database modules
jest.mock('../lib/database/polls', () => ({
  pollsDb: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getResults: jest.fn(),
  },
  votesDb: {
    create: jest.fn(),
    hasUserVoted: jest.fn(),
    getByUser: jest.fn(),
  },
}))

// Mock Next.js modules (already in setup, but importing to clear)
jest.mock('next/cache')
jest.mock('next/navigation')

// Typecast the mocked functions to make TypeScript happy
const mockedPollsDb = pollsDb as jest.Mocked<typeof pollsDb>
const mockedVotesDb = votesDb as jest.Mocked<typeof votesDb>
const mockedRevalidatePath = revalidatePath as jest.Mock
const mockedRedirect = redirect as jest.Mock

describe('Poll Server Actions', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  // Tests for createPollAction
  describe('createPollAction', () => {
    it('should create a poll and redirect on success', async () => {
      const formData = new FormData()
      formData.append('title', 'Favorite Color?')
      formData.append('description', 'A simple poll')
      formData.append('option_0', 'Red')
      formData.append('option_1', 'Blue')
      formData.append('user_id', 'user_123')

      const mockPollResponse: PollWithOptions = {
        id: 'poll_xyz',
        title: 'Favorite Color?',
        options: [
          { id: 'opt_1', poll_id: 'poll_xyz', option_text: 'Red', option_order: 0, created_at: '' },
          { id: 'opt_2', poll_id: 'poll_xyz', option_text: 'Blue', option_order: 1, created_at: '' },
        ],
        total_votes: 0,
        created_at: '',
        updated_at: '',
        is_active: true,
        allow_multiple_votes: false,
        is_anonymous: false,
        max_votes_per_user: 1,
      }

      mockedPollsDb.create.mockResolvedValue({ success: true, data: mockPollResponse })

      await createPollAction(formData)

      expect(mockedPollsDb.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Favorite Color?',
          options: ['Red', 'Blue'],
        }),
        'user_123'
      )
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/polls')
      expect(mockedRedirect).toHaveBeenCalledWith('/polls/poll_xyz')
    })

    it('should throw an error if title is missing', async () => {
      const formData = new FormData()
      formData.append('option_0', 'Red')
      formData.append('option_1', 'Blue')

      await expect(createPollAction(formData)).rejects.toThrow('Poll title is required')
    })

    it('should throw an error if there are less than 2 options', async () => {
      const formData = new FormData()
      formData.append('title', 'Favorite Color?')
      formData.append('option_0', 'Red')

      await expect(createPollAction(formData)).rejects.toThrow('Poll must have at least 2 options')
    })

    it('should throw an error if the database operation fails', async () => {
      const formData = new FormData()
      formData.append('title', 'Favorite Color?')
      formData.append('option_0', 'Red')
      formData.append('option_1', 'Blue')

      mockedPollsDb.create.mockResolvedValue({ success: false, error: { message: 'DB error' } })

      await expect(createPollAction(formData)).rejects.toThrow('DB error')
    })
  })

  // Tests for createPollFromData
  describe('createPollFromData', () => {
    it('should create a poll and return data on success', async () => {
      const pollData: CreatePollInput = {
        title: 'Best Framework?',
        options: ['React', 'Vue', 'Svelte'],
      }

      const mockPollResponse = { id: 'poll_abc' } as PollWithOptions
      mockedPollsDb.create.mockResolvedValue({ success: true, data: mockPollResponse })

      const result = await createPollFromData(pollData, 'user_456')

      expect(mockedPollsDb.create).toHaveBeenCalledWith(pollData, 'user_456')
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/polls')
      expect(result).toEqual(mockPollResponse)
      expect(mockedRedirect).not.toHaveBeenCalled()
    })

    it('should throw an error if title is missing', async () => {
      const pollData = { options: ['React', 'Vue'] } as CreatePollInput
      await expect(createPollFromData(pollData)).rejects.toThrow('Poll title is required')
    })

    it('should throw an error if options are missing', async () => {
      const pollData = { title: 'Best Framework?' } as CreatePollInput
      await expect(createPollFromData(pollData)).rejects.toThrow('Poll must have at least 2 options')
    })
  })

  // Tests for voteOnPollAction
  describe('voteOnPollAction', () => {
    it('should record a vote and revalidate paths', async () => {
      const formData = new FormData()
      formData.append('poll_id', 'poll_123')
      formData.append('option_id', 'option_abc')
      formData.append('user_id', 'user_789')

      mockedVotesDb.hasUserVoted.mockResolvedValue({ success: true, data: false })
      mockedVotesDb.create.mockResolvedValue({ success: true, data: { id: 'vote_xyz' } as any })

      await voteOnPollAction(formData)

      expect(mockedVotesDb.hasUserVoted).toHaveBeenCalledWith('poll_123', 'user_789')
      expect(mockedVotesDb.create).toHaveBeenCalledWith(
        expect.objectContaining({
          poll_id: 'poll_123',
          option_id: 'option_abc',
        })
      )
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/polls/poll_123')
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/polls')
    })

    it('should throw an error if user has already voted', async () => {
      const formData = new FormData()
      formData.append('poll_id', 'poll_123')
      formData.append('option_id', 'option_abc')
      formData.append('user_id', 'user_789')

      mockedVotesDb.hasUserVoted.mockResolvedValue({ success: true, data: true })

      await expect(voteOnPollAction(formData)).rejects.toThrow('You have already voted on this poll')
    })

    it('should throw an error if poll ID is missing', async () => {
      const formData = new FormData()
      formData.append('option_id', 'option_abc')
      await expect(voteOnPollAction(formData)).rejects.toThrow('Poll ID is required')
    })
  })

  // Tests for updatePollAction
  describe('updatePollAction', () => {
    it('should update a poll and revalidate paths', async () => {
      const formData = new FormData()
      formData.append('title', 'New Title')
      formData.append('is_active', 'on')

      mockedPollsDb.update.mockResolvedValue({ success: true, data: { id: 'poll_xyz' } as any })

      await updatePollAction('poll_xyz', formData)

      expect(mockedPollsDb.update).toHaveBeenCalledWith('poll_xyz', { title: 'New Title', is_active: true })
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/polls/poll_xyz')
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/polls')
    })
  })

  // Tests for deletePollAction
  describe('deletePollAction', () => {
    it('should delete a poll and revalidate path', async () => {
      mockedPollsDb.delete.mockResolvedValue({ success: true })

      const result = await deletePollAction('poll_to_delete')

      expect(mockedPollsDb.delete).toHaveBeenCalledWith('poll_to_delete')
      expect(mockedRevalidatePath).toHaveBeenCalledWith('/polls')
      expect(result).toEqual({ success: true })
    })

    it('should throw an error if poll ID is missing', async () => {
      await expect(deletePollAction('')).rejects.toThrow('Poll ID is required')
    })
  })

  // Other action tests
  describe('getPollResultsAction', () => {
    it('should return poll results on success', async () => {
      const mockResults = { poll: { title: 'Results' }, options: [], total_votes: 10 }
      mockedPollsDb.getResults.mockResolvedValue({ success: true, data: mockResults as any })
      const results = await getPollResultsAction('poll_res')
      expect(results).toEqual(mockResults)
    })
  })

  describe('getUserVotesAction', () => {
    it('should return user votes on success', async () => {
      const mockVotes = [{ id: 'vote_1' }, { id: 'vote_2' }]
      mockedVotesDb.getByUser.mockResolvedValue({ success: true, data: mockVotes as any })
      const votes = await getUserVotesAction('poll_id', 'user_id')
      expect(votes).toEqual(mockVotes)
    })
  })

  describe('checkUserVotedAction', () => {
    it('should return true if user has voted', async () => {
      mockedVotesDb.hasUserVoted.mockResolvedValue({ success: true, data: true })
      const hasVoted = await checkUserVotedAction('poll_id', 'user_id')
      expect(hasVoted).toBe(true)
    })
  })
})
