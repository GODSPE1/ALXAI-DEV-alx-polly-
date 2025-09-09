import { supabase } from '../supabase'
import { createClient } from '../supabase/server'
import type {
  Poll,
  PollOption,
  Vote,
  CreatePollInput,
  UpdatePollInput,
  CreateVoteInput,
  PollWithOptions,
  PollResultsResponse,
  ApiResponse,
  PaginatedResponse
} from '../types/database'

// Poll operations
export const pollsDb = {
  // Create a new poll with options
  async create(input: CreatePollInput, userId?: string): Promise<ApiResponse<PollWithOptions>> {
    try {
      const client = await createClient()

      // Create the poll
      const { data: pollData, error: pollError } = await client
        .from('polls')
        .insert({
          title: input.title,
          description: input.description || null,
          created_by: userId || null,
          expires_at: input.expires_at || null,
          allow_multiple_votes: input.allow_multiple_votes || false,
          is_anonymous: input.is_anonymous || false,
          max_votes_per_user: input.max_votes_per_user || 1,
        })
        .select()
        .single()

      if (pollError || !pollData) {
        return { success: false, error: { message: pollError?.message || 'Failed to create poll' } }
      }

      // Create poll options
      const optionsData = input.options.map((optionText, index) => ({
        poll_id: pollData.id,
        option_text: optionText,
        option_order: index,
      }))

      const { data: optionsResult, error: optionsError } = await client
        .from('poll_options')
        .insert(optionsData)
        .select()

      if (optionsError || !optionsResult) {
        // Clean up the poll if options creation failed
        await client.from('polls').delete().eq('id', pollData.id)
        return { success: false, error: { message: optionsError?.message || 'Failed to create poll options' } }
      }

      const poll: PollWithOptions = {
        ...pollData,
        options: optionsResult,
        total_votes: 0,
      }

      return { success: true, data: poll }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
      }
    }
  },

  // Get all active polls with pagination
  async getActive(page = 1, limit = 10): Promise<ApiResponse<PaginatedResponse<PollWithOptions>>> {
    try {
      const client = await createClient()
      const offset = (page - 1) * limit

      // Get total count
      const { count, error: countError } = await client
        .from('polls')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')

      if (countError) {
        return { success: false, error: { message: countError.message } }
      }

      // Get polls with options
      const { data: pollsData, error: pollsError } = await client
        .from('polls')
        .select(`
          *,
          poll_options (*),
          votes (count)
        `)
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (pollsError || !pollsData) {
        return { success: false, error: { message: pollsError?.message || 'Failed to fetch polls' } }
      }

      const polls: PollWithOptions[] = pollsData.map(poll => ({
        id: poll.id,
        title: poll.title,
        description: poll.description,
        created_by: poll.created_by,
        created_at: poll.created_at,
        updated_at: poll.updated_at,
        expires_at: poll.expires_at,
        is_active: poll.is_active,
        allow_multiple_votes: poll.allow_multiple_votes,
        is_anonymous: poll.is_anonymous,
        max_votes_per_user: poll.max_votes_per_user,
        options: poll.poll_options.sort((a: any, b: any) => a.option_order - b.option_order),
        total_votes: Array.isArray(poll.votes) ? poll.votes.length : 0,
      }))

      const totalPages = Math.ceil((count || 0) / limit)

      return {
        success: true,
        data: {
          data: polls,
          count: count || 0,
          page,
          limit,
          total_pages: totalPages,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
      }
    }
  },

  // Get a poll by ID with options and vote counts
  async getById(id: string): Promise<ApiResponse<PollWithOptions>> {
    try {
      const client = await createClient()

      const { data: pollData, error: pollError } = await client
        .from('polls')
        .select(`
          *,
          poll_options (*)
        `)
        .eq('id', id)
        .single()

      if (pollError || !pollData) {
        return { success: false, error: { message: pollError?.message || 'Poll not found' } }
      }

      // Get vote counts for each option
      const { data: voteData, error: voteError } = await client
        .from('votes')
        .select('option_id')
        .eq('poll_id', id)

      if (voteError) {
        return { success: false, error: { message: voteError.message } }
      }

      const voteCounts = voteData?.reduce((acc: Record<string, number>, vote) => {
        acc[vote.option_id] = (acc[vote.option_id] || 0) + 1
        return acc
      }, {}) || {}

      const optionsWithVotes = pollData.poll_options
        .map((option: any) => ({
          ...option,
          vote_count: voteCounts[option.id] || 0,
        }))
        .sort((a: any, b: any) => a.option_order - b.option_order)

      const poll: PollWithOptions = {
        ...pollData,
        options: optionsWithVotes,
        total_votes: voteData?.length || 0,
      }

      return { success: true, data: poll }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
      }
    }
  },

  // Get polls created by a user
  async getByUser(userId: string, page = 1, limit = 10): Promise<ApiResponse<PaginatedResponse<PollWithOptions>>> {
    try {
      const client = await createClient()
      const offset = (page - 1) * limit

      // Get total count
      const { count, error: countError } = await client
        .from('polls')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)

      if (countError) {
        return { success: false, error: { message: countError.message } }
      }

      // Get polls with options
      const { data: pollsData, error: pollsError } = await client
        .from('polls')
        .select(`
          *,
          poll_options (*),
          votes (count)
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (pollsError || !pollsData) {
        return { success: false, error: { message: pollsError?.message || 'Failed to fetch user polls' } }
      }

      const polls: PollWithOptions[] = pollsData.map(poll => ({
        id: poll.id,
        title: poll.title,
        description: poll.description,
        created_by: poll.created_by,
        created_at: poll.created_at,
        updated_at: poll.updated_at,
        expires_at: poll.expires_at,
        is_active: poll.is_active,
        allow_multiple_votes: poll.allow_multiple_votes,
        is_anonymous: poll.is_anonymous,
        max_votes_per_user: poll.max_votes_per_user,
        options: poll.poll_options.sort((a: any, b: any) => a.option_order - b.option_order),
        total_votes: Array.isArray(poll.votes) ? poll.votes.length : 0,
      }))

      const totalPages = Math.ceil((count || 0) / limit)

      return {
        success: true,
        data: {
          data: polls,
          count: count || 0,
          page,
          limit,
          total_pages: totalPages,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
      }
    }
  },

  // Update a poll
  async update(id: string, input: UpdatePollInput, userId?: string): Promise<ApiResponse<Poll>> {
    try {
      const client = await createClient()

      const updateData = {
        ...(input.title && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.expires_at !== undefined && { expires_at: input.expires_at }),
        ...(input.is_active !== undefined && { is_active: input.is_active }),
        ...(input.allow_multiple_votes !== undefined && { allow_multiple_votes: input.allow_multiple_votes }),
        ...(input.is_anonymous !== undefined && { is_anonymous: input.is_anonymous }),
        ...(input.max_votes_per_user !== undefined && { max_votes_per_user: input.max_votes_per_user }),
      }

      const query = client
        .from('polls')
        .update(updateData)
        .eq('id', id)

      if (userId) {
        query.eq('created_by', userId)
      }

      const { data, error } = await query.select().single()

      if (error || !data) {
        return { success: false, error: { message: error?.message || 'Failed to update poll' } }
      }

      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
      }
    }
  },

  // Delete a poll
  async delete(id: string, userId?: string): Promise<ApiResponse<void>> {
    try {
      const client = await createClient()

      const query = client
        .from('polls')
        .delete()
        .eq('id', id)

      if (userId) {
        query.eq('created_by', userId)
      }

      const { error } = await query

      if (error) {
        return { success: false, error: { message: error.message } }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
      }
    }
  },

  // Get poll results with detailed vote information
  async getResults(id: string): Promise<ApiResponse<PollResultsResponse>> {
    try {
      const client = await createClient()

      const { data: resultsData, error: resultsError } = await client
        .from('poll_results')
        .select('*')
        .eq('poll_id', id)

      if (resultsError || !resultsData) {
        return { success: false, error: { message: resultsError?.message || 'Failed to get poll results' } }
      }

      if (resultsData.length === 0) {
        return { success: false, error: { message: 'Poll not found' } }
      }

      const firstResult = resultsData[0]
      const poll: Poll = {
        id: firstResult.poll_id,
        title: firstResult.title,
        description: firstResult.description,
        created_at: firstResult.poll_created_at,
        updated_at: firstResult.poll_created_at, // This would need to be fetched separately for accuracy
        expires_at: firstResult.expires_at,
        is_active: firstResult.is_active,
        allow_multiple_votes: false, // This would need to be fetched separately
        is_anonymous: false, // This would need to be fetched separately
        max_votes_per_user: 1, // This would need to be fetched separately
      }

      const options = resultsData
        .filter(result => result.option_id)
        .map(result => ({
          id: result.option_id!,
          poll_id: result.poll_id,
          option_text: result.option_text!,
          option_order: result.option_order || 0,
          created_at: firstResult.poll_created_at,
          vote_count: result.vote_count,
          vote_percentage: result.vote_percentage || 0,
        }))
        .sort((a, b) => a.option_order - b.option_order)

      const totalVotes = options.reduce((sum, option) => sum + option.vote_count, 0)

      return {
        success: true,
        data: {
          poll,
          options,
          total_votes: totalVotes,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
      }
    }
  }
}

// Vote operations
export const votesDb = {
  // Cast a vote
  async create(input: CreateVoteInput): Promise<ApiResponse<Vote>> {
    try {
      const client = await createClient()

      const { data, error } = await client
        .from('votes')
        .insert({
          poll_id: input.poll_id,
          option_id: input.option_id,
          user_id: input.user_id || null,
          voter_ip: input.voter_ip || null,
        })
        .select()
        .single()

      if (error || !data) {
        return { success: false, error: { message: error?.message || 'Failed to cast vote' } }
      }

      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
      }
    }
  },

  // Get votes for a poll
  async getByPoll(pollId: string): Promise<ApiResponse<Vote[]>> {
    try {
      const client = await createClient()

      const { data, error } = await client
        .from('votes')
        .select('*')
        .eq('poll_id', pollId)
        .order('created_at', { ascending: false })

      if (error || !data) {
        return { success: false, error: { message: error?.message || 'Failed to fetch votes' } }
      }

      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
      }
    }
  },

  // Get votes by a user
  async getByUser(userId: string, page = 1, limit = 10): Promise<ApiResponse<PaginatedResponse<Vote>>> {
    try {
      const client = await createClient()
      const offset = (page - 1) * limit

      // Get total count
      const { count, error: countError } = await client
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (countError) {
        return { success: false, error: { message: countError.message } }
      }

      // Get votes
      const { data, error } = await client
        .from('votes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error || !data) {
        return { success: false, error: { message: error?.message || 'Failed to fetch user votes' } }
      }

      const totalPages = Math.ceil((count || 0) / limit)

      return {
        success: true,
        data: {
          data,
          count: count || 0,
          page,
          limit,
          total_pages: totalPages,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
      }
    }
  },

  // Check if user has voted on a poll
  async hasUserVoted(pollId: string, userId: string): Promise<ApiResponse<boolean>> {
    try {
      const client = await createClient()

      const { data, error } = await client
        .from('votes')
        .select('id')
        .eq('poll_id', pollId)
        .eq('user_id', userId)
        .limit(1)

      if (error) {
        return { success: false, error: { message: error.message } }
      }

      return { success: true, data: data && data.length > 0 }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
      }
    }
  },

  // Get user's vote count for a poll
  async getUserVoteCount(pollId: string, userId: string): Promise<ApiResponse<number>> {
    try {
      const client = await createClient()

      const { count, error } = await client
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('poll_id', pollId)
        .eq('user_id', userId)

      if (error) {
        return { success: false, error: { message: error.message } }
      }

      return { success: true, data: count || 0 }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
      }
    }
  }
}
