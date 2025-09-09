import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/types/database'

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Sample data for seeding
const samplePolls = [
  {
    title: "What's your favorite programming language?",
    description: "Help us understand the community's language preferences",
    options: [
      "JavaScript",
      "Python",
      "TypeScript",
      "Go",
      "Rust",
      "Java"
    ],
    allow_multiple_votes: false,
    is_anonymous: false,
    max_votes_per_user: 1,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
  },
  {
    title: "Which development framework do you prefer?",
    description: "Choose your preferred web development framework",
    options: [
      "React",
      "Vue.js",
      "Angular",
      "Svelte",
      "Next.js",
      "Nuxt.js"
    ],
    allow_multiple_votes: true,
    is_anonymous: false,
    max_votes_per_user: 3,
    expires_at: null // No expiration
  },
  {
    title: "Best time for team meetings?",
    description: "Anonymous poll to find the optimal meeting time",
    options: [
      "9:00 AM",
      "10:00 AM",
      "11:00 AM",
      "2:00 PM",
      "3:00 PM",
      "4:00 PM"
    ],
    allow_multiple_votes: false,
    is_anonymous: true,
    max_votes_per_user: 1,
    expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
  },
  {
    title: "Coffee or Tea?",
    description: "The age-old question",
    options: [
      "Coffee ☕",
      "Tea 🍵",
      "Both!",
      "Neither"
    ],
    allow_multiple_votes: false,
    is_anonymous: false,
    max_votes_per_user: 1,
    expires_at: null
  },
  {
    title: "Which tech topics interest you most?",
    description: "Multiple selections allowed - help us plan our content",
    options: [
      "Artificial Intelligence",
      "Web Development",
      "Mobile Development",
      "DevOps & Cloud",
      "Data Science",
      "Cybersecurity",
      "Blockchain",
      "UI/UX Design"
    ],
    allow_multiple_votes: true,
    is_anonymous: false,
    max_votes_per_user: 5,
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
  }
]

// Create a test user for ownership (optional)
const testUserEmail = 'test@example.com'
const testUserPassword = 'testpassword123'

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n')

  try {
    // Create or get test user
    console.log('👤 Setting up test user...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testUserEmail,
      password: testUserPassword,
    })

    let userId: string | null = null

    if (authError && !authError.message.includes('already registered')) {
      console.error('❌ Error creating test user:', authError.message)
    } else {
      userId = authData.user?.id || null
      console.log('✅ Test user ready:', testUserEmail)
    }

    // Create sample polls
    console.log('\n📊 Creating sample polls...')

    for (const [index, pollData] of samplePolls.entries()) {
      console.log(`\n📝 Creating poll ${index + 1}/${samplePolls.length}: "${pollData.title}"`)

      // Create the poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          title: pollData.title,
          description: pollData.description,
          created_by: userId,
          expires_at: pollData.expires_at,
          allow_multiple_votes: pollData.allow_multiple_votes,
          is_anonymous: pollData.is_anonymous,
          max_votes_per_user: pollData.max_votes_per_user,
          is_active: true,
        })
        .select()
        .single()

      if (pollError || !poll) {
        console.error(`❌ Error creating poll: ${pollError?.message || 'Unknown error'}`)
        continue
      }

      console.log(`✅ Poll created with ID: ${poll.id}`)

      // Create poll options
      const optionsData = pollData.options.map((optionText, optionIndex) => ({
        poll_id: poll.id,
        option_text: optionText,
        option_order: optionIndex,
      }))

      const { data: options, error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsData)
        .select()

      if (optionsError || !options) {
        console.error(`❌ Error creating options: ${optionsError?.message || 'Unknown error'}`)
        continue
      }

      console.log(`✅ Created ${options.length} options for the poll`)

      // Add some sample votes for demonstration
      if (options.length > 0) {
        console.log('🗳️  Adding sample votes...')

        const sampleVotes = []
        const numVotes = Math.floor(Math.random() * 15) + 5 // 5-20 votes per poll

        for (let i = 0; i < numVotes; i++) {
          const randomOption = options[Math.floor(Math.random() * options.length)]

          sampleVotes.push({
            poll_id: poll.id,
            option_id: randomOption.id,
            user_id: pollData.is_anonymous ? null : userId,
            voter_ip: pollData.is_anonymous ? `192.168.1.${Math.floor(Math.random() * 254) + 1}` : null,
          })
        }

        const { data: votes, error: votesError } = await supabase
          .from('votes')
          .insert(sampleVotes)
          .select()

        if (votesError) {
          console.log(`⚠️  Some votes couldn't be created: ${votesError.message}`)
        } else {
          console.log(`✅ Added ${votes?.length || 0} sample votes`)
        }
      }
    }

    // Display summary
    console.log('\n📈 Seeding Summary:')

    const { data: pollCount } = await supabase
      .from('polls')
      .select('id', { count: 'exact' })

    const { data: optionCount } = await supabase
      .from('poll_options')
      .select('id', { count: 'exact' })

    const { data: voteCount } = await supabase
      .from('votes')
      .select('id', { count: 'exact' })

    console.log(`📊 Total Polls: ${pollCount?.length || 0}`)
    console.log(`📝 Total Options: ${optionCount?.length || 0}`)
    console.log(`🗳️  Total Votes: ${voteCount?.length || 0}`)

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n💡 Next steps:')
    console.log('   1. Start your Next.js development server')
    console.log('   2. Navigate to your polls page to see the sample data')
    console.log('   3. Test creating, voting, and viewing poll results')

    if (userId) {
      console.log(`   4. Test user credentials: ${testUserEmail} / ${testUserPassword}`)
    }

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error)
    process.exit(1)
  }
}

// Helper function to clear existing data (use with caution!)
async function clearDatabase() {
  console.log('🗑️  Clearing existing data...')

  try {
    // Delete in reverse order due to foreign key constraints
    await supabase.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('poll_options').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('polls').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    console.log('✅ Database cleared')
  } catch (error) {
    console.error('❌ Error clearing database:', error)
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--clear')) {
    await clearDatabase()
  }

  await seedDatabase()
}

// Run the script
if (require.main === module) {
  main().catch(console.error)
}

export { seedDatabase, clearDatabase }
