export interface Database {
  public: {
    Tables: {
      polls: {
        Row: {
          id: string
          title: string
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          expires_at: string | null
          is_active: boolean
          allow_multiple_votes: boolean
          is_anonymous: boolean
          max_votes_per_user: number
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          expires_at?: string | null
          is_active?: boolean
          allow_multiple_votes?: boolean
          is_anonymous?: boolean
          max_votes_per_user?: number
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          expires_at?: string | null
          is_active?: boolean
          allow_multiple_votes?: boolean
          is_anonymous?: boolean
          max_votes_per_user?: number
        }
      }
      poll_options: {
        Row: {
          id: string
          poll_id: string
          option_text: string
          option_order: number
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          option_text: string
          option_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          poll_id?: string
          option_text?: string
          option_order?: number
          created_at?: string
        }
      }
      votes: {
        Row: {
          id: string
          poll_id: string
          option_id: string
          user_id: string | null
          voter_ip: string | null
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          option_id: string
          user_id?: string | null
          voter_ip?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          poll_id?: string
          option_id?: string
          user_id?: string | null
          voter_ip?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      poll_results: {
        Row: {
          poll_id: string
          title: string
          description: string | null
          poll_created_at: string
          expires_at: string | null
          is_active: boolean
          option_id: string | null
          option_text: string | null
          option_order: number | null
          vote_count: number
          vote_percentage: number | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Application-level types for easier use
export interface Poll {
  id: string
  title: string
  description?: string
  created_by?: string
  created_at: string
  updated_at: string
  expires_at?: string
  is_active: boolean
  allow_multiple_votes: boolean
  is_anonymous: boolean
  max_votes_per_user: number
  options?: PollOption[]
  total_votes?: number
}

export interface PollOption {
  id: string
  poll_id: string
  option_text: string
  option_order: number
  created_at: string
  vote_count?: number
  vote_percentage?: number
}

export interface Vote {
  id: string
  poll_id: string
  option_id: string
  user_id?: string
  voter_ip?: string
  created_at: string
}

export interface PollResult {
  poll_id: string
  title: string
  description?: string
  poll_created_at: string
  expires_at?: string
  is_active: boolean
  option_id?: string
  option_text?: string
  option_order?: number
  vote_count: number
  vote_percentage?: number
}

// Input types for creating/updating polls
export interface CreatePollInput {
  title: string
  description?: string
  expires_at?: string
  allow_multiple_votes?: boolean
  is_anonymous?: boolean
  max_votes_per_user?: number
  options: string[]
}

export interface UpdatePollInput {
  title?: string
  description?: string
  expires_at?: string
  is_active?: boolean
  allow_multiple_votes?: boolean
  is_anonymous?: boolean
  max_votes_per_user?: number
}

export interface CreateVoteInput {
  poll_id: string
  option_id: string
  user_id?: string
  voter_ip?: string
}

// Response types
export interface PollWithOptions extends Poll {
  options: PollOption[]
  total_votes: number
}

export interface PollResultsResponse {
  poll: Poll
  options: Array<PollOption & { vote_count: number; vote_percentage: number }>
  total_votes: number
}

// Error types
export interface DatabaseError {
  message: string
  code?: string
  details?: string
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: DatabaseError
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  total_pages: number
}
