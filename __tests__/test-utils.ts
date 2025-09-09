import type { ApiResponse, PollWithOptions, Vote } from '../lib/types/database'

/**
 * Creates a FormData object from a plain JavaScript object.
 * @param data - The object to convert to FormData.
 * @returns A FormData object.
 */
export const createMockFormData = (data: Record<string, string | number | boolean>): FormData => {
  const formData = new FormData()
  for (const key in data) {
    formData.append(key, String(data[key]))
  }
  return formData
}

/**
 * Creates a standardized mock success response for API calls.
 * @param data - The data payload for the successful response.
 * @returns An ApiResponse object indicating success.
 */
export const createMockSuccessResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
})

/**
 * Creates a standardized mock error response for API calls.
 * @param message - The error message.
 * @param code - Optional error code.
 * @returns An ApiResponse object indicating failure.
 */
export const createMockErrorResponse = <T>(
  message: string,
  code?: string
): ApiResponse<T> => ({
  success: false,
  error: { message, code },
})

/**
 * A factory function to create mock poll data for testing.
 * @param overrides - Optional overrides for the default poll data.
 * @returns A complete mock poll object.
 */
export const createMockPoll = (overrides: Partial<PollWithOptions> = {}): PollWithOptions => {
  const defaultPoll: PollWithOptions = {
    id: `poll_${Math.random().toString(36).substring(2, 9)}`,
    title: 'Default Test Poll',
    description: 'This is a default poll for testing purposes.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: null,
    is_active: true,
    allow_multiple_votes: false,
    is_anonymous: false,
    max_votes_per_user: 1,
    created_by: `user_${Math.random().toString(36).substring(2, 9)}`,
    options: [
      {
        id: `opt_${Math.random().toString(36).substring(2, 9)}`,
        poll_id: 'poll_default_id', // This will be overwritten by the poll's id
        option_text: 'Default Option 1',
        option_order: 0,
        created_at: new Date().toISOString(),
        vote_count: 0,
      },
      {
        id: `opt_${Math.random().toString(36).substring(2, 9)}`,
        poll_id: 'poll_default_id', // This will be overwritten by the poll's id
        option_text: 'Default Option 2',
        option_order: 1,
        created_at: new Date().toISOString(),
        vote_count: 0,
      },
    ],
    total_votes: 0,
  }

  const poll = { ...defaultPoll, ...overrides }

  // Ensure options have the correct poll_id
  poll.options = poll.options.map(opt => ({ ...opt, poll_id: poll.id }))

  return poll
}

/**
 * A factory function to create a mock vote.
 * @param overrides - Optional overrides for the default vote data.
 * @returns A complete mock vote object.
 */
export const createMockVote = (overrides: Partial<Vote> = {}): Vote => {
    const defaultVote: Vote = {
        id: `vote_${Math.random().toString(36).substring(2, 9)}`,
        poll_id: `poll_${Math.random().toString(36).substring(2, 9)}`,
        option_id: `opt_${Math.random().toString(36).substring(2, 9)}`,
        user_id: `user_${Math.random().toString(36).substring(2, 9)}`,
        created_at: new Date().toISOString(),
    };

    return { ...defaultVote, ...overrides };
}
