import {
  createPollAction,
  voteOnPollAction,
  updatePollAction,
  deletePollAction,
} from '../lib/poll-actions'
import { pollsDb, votesDb } from '../lib/database/polls'

// Mock the database modules
jest.mock('../lib/database/polls', () => ({
  pollsDb: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  votesDb: {
    create: jest.fn(),
    hasUserVoted: jest.fn(),
  },
}))

// Mock Next.js modules
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

const mockedPollsDb = pollsDb as jest.Mocked<typeof pollsDb>
const mockedVotesDb = votesDb as jest.Mocked<typeof votesDb>

describe('Poll Server Actions - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Edge cases for createPollAction
  describe('createPollAction Edge Cases', () => {
    it('should trim whitespace from title, description, and options', async () => {
      const formData = new FormData()
      formData.append('title', '  Spaced Title  ')
      formData.append('description', '  Spaced Description ')
      formData.append('option_0', '  Option A  ')
      formData.append('option_1', 'Option B ')
      formData.append('option_2', '') // Empty option should be ignored
      formData.append('option_3', '  ') // Whitespace option should be ignored

      mockedPollsDb.create.mockResolvedValue({ success: true, data: { id: 'poll_123' } as any })

      await createPollAction(formData)

      expect(mockedPollsDb.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Spaced Title',
          description: 'Spaced Description',
          options: ['Option A', 'Option B'],
        }),
        undefined
      )
    })

    it('should handle non-numeric max_votes_per_user gracefully', async () => {
      const formData = new FormData()
      formData.append('title', 'Test Poll')
      formData.append('option_0', 'A')
      formData.append('option_1', 'B')
      formData.append('max_votes_per_user', 'abc') // Invalid number

      mockedPollsDb.create.mockResolvedValue({ success: true, data: { id: 'poll_123' } as any })

      await createPollAction(formData)

      expect(mockedPollsDb.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_votes_per_user: 1, // Should default to 1
        }),
        undefined
      )
    })

    it('should throw a generic error if a non-Error object is caught', async () => {
      const formData = new FormData()
      formData.append('title', 'Test Poll')
      formData.append('option_0', 'A')
      formData.append('option_1', 'B')

      mockedPollsDb.create.mockImplementation(() => {
        // eslint-disable-next-line no-throw-literal
        throw 'a string error'
      })

      await expect(createPollAction(formData)).rejects.toThrow('Unknown error occurred')
    })
  })

  // Edge cases for voteOnPollAction
  describe('voteOnPollAction Edge Cases', () => {
    it('should proceed with voting if user_id is not provided (anonymous)', async () => {
      const formData = new FormData()
      formData.append('poll_id', 'poll_456')
      formData.append('option_id', 'option_def')
      formData.append('voter_ip', '127.0.0.1')

      mockedVotesDb.create.mockResolvedValue({ success: true, data: { id: 'vote_123' } as any })

      await voteOnPollAction(formData)

      expect(mockedVotesDb.hasUserVoted).not.toHaveBeenCalled()
      expect(mockedVotesDb.create).toHaveBeenCalledWith({
        poll_id: 'poll_456',
        option_id: 'option_def',
        user_id: undefined,
        voter_ip: '127.0.0.1',
      })
    })

    it('should throw an error if hasUserVoted check fails', async () => {
      const formData = new FormData()
      formData.append('poll_id', 'poll_456')
      formData.append('option_id', 'option_def')
      formData.append('user_id', 'user_abc')

      mockedVotesDb.hasUserVoted.mockResolvedValue({
        success: false,
        error: { message: 'Failed to query votes' },
      })

      await expect(voteOnPollAction(formData)).rejects.toThrow('Failed to query votes')
    })
  })

  // Edge cases for updatePollAction
  describe('updatePollAction Edge Cases', () => {
    it('should not include fields that are present but empty in the update payload', async () => {
      const formData = new FormData()
      formData.append('title', ' ') // Whitespace only
      formData.append('description', '') // Empty string
      formData.append('expires_at', '') // Empty string

      mockedPollsDb.update.mockResolvedValue({ success: true, data: { id: 'poll_789' } as any })

      await updatePollAction('poll_789', formData)

      // The only field that should be updated is description to undefined, title and expires_at should be ignored
      expect(mockedPollsDb.update).toHaveBeenCalledWith('poll_789', {
        description: undefined,
      })
    })

    it('should handle missing form data gracefully without sending any updates', async () => {
      const formData = new FormData() // Completely empty form data

      mockedPollsDb.update.mockResolvedValue({ success: true, data: { id: 'poll_789' } as any })

      await updatePollAction('poll_789', formData)

      expect(mockedPollsDb.update).toHaveBeenCalledWith('poll_789', {})
    })
  })

  // Edge cases for deletePollAction
  describe('deletePollAction Edge Cases', () => {
    it('should throw an error if database deletion fails', async () => {
      mockedPollsDb.delete.mockResolvedValue({
        success: false,
        error: { message: 'Permission denied' },
      })

      await expect(deletePollAction('poll_abc')).rejects.toThrow('Permission denied')
    })

    it('should throw an error if pollId is null or undefined', async () => {
      // @ts-expect-error Testing invalid input
      await expect(deletePollAction(null)).rejects.toThrow('Poll ID is required')
      // @ts-expect-error Testing invalid input
      await expect(deletePollAction(undefined)).rejects.toThrow('Poll ID is required')
    })
  })
})
