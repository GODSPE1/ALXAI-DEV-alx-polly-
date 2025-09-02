# Alx-Polly - Polling Application

A modern polling application built with Next.js 15, TypeScript, Supabase, and Tailwind CSS. Create and manage polls with real-time authentication and user management.

## Features

- 🔐 **User Authentication** - Complete auth flow with Supabase
- 🗳️ **Poll Management** - Create, edit, and manage polls
- 🎨 **Modern UI** - Beautiful interface with Tailwind CSS
- 📱 **Responsive Design** - Works on all devices
- ⚡ **Real-time Updates** - Live poll results
- 🛡️ **Protected Routes** - Secure user areas

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel (recommended)

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account and project
- Git for version control

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd alx-polly
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Supabase Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Fill in your project details

2. **Get Your API Keys**
   - Go to Project Settings → API
   - Copy your Project URL and anon/public key

3. **Configure Authentication**
   - Go to Authentication → Settings
   - Configure your site URL: `http://localhost:3000` (for development)
   - Enable email confirmations (optional but recommended)
   - Add production URLs when deploying

### 4. Environment Variables

The `.env.local` file is already configured with your Supabase credentials. Make sure it contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Authentication Flow

The app includes a complete authentication system:

- **Sign Up** (`/sign-up`) - User registration with email confirmation
- **Sign In** (`/sign-in`) - User login
- **Forgot Password** (`/forgot-password`) - Password reset
- **Reset Password** (`/reset-password`) - Set new password
- **Email Confirmation** (`/callback`) - Handle email confirmations

## Project Structure

```
alx-polly/
├── app/
│   ├── (auth)/          # Authentication pages
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── callback/
│   ├── polls/           # Poll management pages
│   ├── layout.tsx       # Root layout with AuthProvider
│   └── page.tsx         # Landing page
├── components/
│   └── ui/
│       ├── navbar.tsx   # Auth-aware navigation
│       └── ProtectedRoute.tsx  # Route protection
├── contexts/
│   └── AuthContext.tsx  # Authentication context
├── lib/
│   ├── supabase.ts      # Client-side Supabase client
│   └── supabase/
│       └── server.ts    # Server-side Supabase client
├── middleware.ts        # Auth middleware for route protection
└── .env.example         # Environment variables template
```

## Key Components

### AuthContext

Provides authentication state throughout the app:

```tsx
const { user, session, loading, signIn, signUp, signOut } = useAuth();
```

### ProtectedRoute

Wraps pages that require authentication:

```tsx
<ProtectedRoute>
  <YourProtectedContent />
</ProtectedRoute>
```

### Middleware

Automatically handles:
- Redirecting unauthenticated users to sign-in
- Redirecting authenticated users away from auth pages
- Route protection for `/polls`, `/profile`, etc.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Update your Supabase project settings with your production URL

### Environment Variables for Production

Make sure to set these in your deployment platform:

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Supabase Database Setup

The application uses Supabase's built-in auth system, so no additional database setup is required for authentication. User data is automatically managed by Supabase Auth.

For poll functionality, you'll need to create additional tables in your Supabase database (not covered in this authentication setup).

## Troubleshooting

### Common Issues

1. **"Invalid login credentials"**
   - Check your email/password
   - Ensure email is confirmed if confirmation is enabled

2. **Redirect loops**
   - Check your site URL in Supabase settings
   - Verify environment variables are correct

3. **CORS errors**
   - Ensure your domain is added to Supabase allowed origins

### Support

For issues related to:
- **Supabase**: Check [Supabase docs](https://supabase.com/docs)
- **Next.js**: Check [Next.js docs](https://nextjs.org/docs)
- **Authentication**: Review the auth flow implementation in `contexts/AuthContext.tsx`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
