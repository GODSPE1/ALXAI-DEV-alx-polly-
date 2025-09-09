# Supabase Database Setup for ALX Polly

This directory contains the database schema and setup files for the ALX Polly polling application.

## Database Schema Overview

The database consists of three main tables:

### 1. `polls` Table
Stores poll information including title, description, settings, and metadata.

**Key Features:**
- Supports poll expiration dates
- Configurable multiple votes per user
- Anonymous voting support
- Poll activation/deactivation

### 2. `poll_options` Table
Stores the voting options for each poll.

**Key Features:**
- Ordered options (option_order field)
- Cascading delete when poll is deleted

### 3. `votes` Table
Stores individual votes cast by users.

**Key Features:**
- Links to both poll and specific option
- Supports both authenticated and anonymous voting
- IP tracking for anonymous votes
- Constraints to prevent duplicate voting (configurable)

### Additional Features

#### Views
- `poll_results`: Aggregated view showing vote counts and percentages for each option

#### Security
- Row Level Security (RLS) enabled on all tables
- Policies for viewing, creating, updating, and deleting based on user permissions
- Anonymous users can view active polls and vote (if allowed)

#### Functions & Triggers
- Automatic `updated_at` timestamp updates
- Vote constraint validation
- Cascade deletes for data integrity

## Setup Instructions

### 1. Database Migration

Run the migration file to create the schema:

```bash
# If using Supabase CLI
supabase db reset

# Or manually execute the SQL file in your Supabase dashboard
# Copy and paste the content of migrations/20241201_initial_schema.sql
```

### 2. Environment Variables

Ensure you have the following environment variables set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. TypeScript Types

The database types are automatically generated and available in:
- `lib/types/database.ts` - Complete database type definitions
- `lib/supabase.ts` - Typed Supabase client

### 4. Database Operations

Use the utility functions provided in `lib/database/polls.ts`:

```typescript
import { pollsDb, votesDb } from '@/lib/database/polls'

// Create a new poll
const result = await pollsDb.create({
  title: "What's your favorite color?",
  description: "Choose your preferred color",
  options: ["Red", "Blue", "Green", "Yellow"],
  allow_multiple_votes: false,
  is_anonymous: false,
  max_votes_per_user: 1
}, userId)

// Get active polls
const activePolls = await pollsDb.getActive(1, 10)

// Cast a vote
const vote = await votesDb.create({
  poll_id: "poll-uuid",
  option_id: "option-uuid",
  user_id: "user-uuid"
})
```

## Database Permissions

### Authenticated Users Can:
- View all active polls
- Create new polls
- Update/delete their own polls
- Vote on active polls (respecting poll settings)
- View their own voting history

### Anonymous Users Can:
- View active polls
- Vote on polls that allow anonymous voting
- View poll results

### Poll Creators Can:
- View all votes on their polls (including anonymous ones)
- Modify poll settings
- Activate/deactivate polls
- Delete polls (cascades to options and votes)

## Security Features

### Row Level Security Policies

1. **Polls Table:**
   - Public can view active, non-expired polls
   - Users can view/modify their own polls
   - Creators have full control over their polls

2. **Poll Options Table:**
   - Visible for active polls or to poll creators
   - Only poll creators can modify options

3. **Votes Table:**
   - Users can vote on active polls
   - Vote constraints enforced via triggers
   - Anonymous voting supported where enabled

### Data Validation

- Poll expiration enforcement
- Vote limit validation
- Duplicate vote prevention
- Option validation (must belong to poll)

## Common Queries

### Get Poll with Results
```sql
SELECT * FROM poll_results WHERE poll_id = 'your-poll-id';
```

### Check if User Voted
```sql
SELECT COUNT(*) FROM votes 
WHERE poll_id = 'poll-id' AND user_id = 'user-id';
```

### Get Top Polls by Vote Count
```sql
SELECT p.*, COUNT(v.id) as total_votes
FROM polls p
LEFT JOIN votes v ON p.id = v.poll_id
WHERE p.is_active = true
GROUP BY p.id
ORDER BY total_votes DESC
LIMIT 10;
```

## Backup and Maintenance

### Regular Maintenance Tasks

1. **Clean up expired polls:**
```sql
UPDATE polls 
SET is_active = false 
WHERE expires_at < NOW() AND is_active = true;
```

2. **Archive old votes:**
```sql
-- Create archive table if needed, then move old votes
-- This depends on your retention policy
```

### Monitoring Queries

1. **Active polls count:**
```sql
SELECT COUNT(*) FROM polls WHERE is_active = true;
```

2. **Daily vote activity:**
```sql
SELECT DATE(created_at) as date, COUNT(*) as votes
FROM votes
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Troubleshooting

### Common Issues

1. **Permission denied errors:**
   - Check RLS policies are properly configured
   - Verify user authentication status
   - Ensure user has permission for the operation

2. **Vote constraint violations:**
   - Check if user already voted (for single-vote polls)
   - Verify poll is still active
   - Check if poll has expired

3. **Missing poll options:**
   - Ensure options are created in the same transaction as poll
   - Check cascading delete hasn't removed options

### Debug Queries

```sql
-- Check user's permissions
SELECT auth.uid(), auth.role();

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('polls', 'poll_options', 'votes');

-- Check poll status
SELECT id, title, is_active, expires_at, 
       CASE WHEN expires_at < NOW() THEN 'expired' ELSE 'active' END as status
FROM polls WHERE id = 'your-poll-id';
```

## Migration History

- `20241201_initial_schema.sql` - Initial database schema with polls, options, votes, RLS policies, and utility functions

For questions or issues, please refer to the Supabase documentation or create an issue in the project repository.