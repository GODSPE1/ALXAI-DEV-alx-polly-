-- Create polls table
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    allow_multiple_votes BOOLEAN DEFAULT false,
    is_anonymous BOOLEAN DEFAULT false,
    max_votes_per_user INTEGER DEFAULT 1
);

-- Create poll_options table
CREATE TABLE IF NOT EXISTS public.poll_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    option_text VARCHAR(500) NOT NULL,
    option_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    option_id UUID REFERENCES public.poll_options(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    voter_ip INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one vote per user per poll (unless multiple votes allowed)
    CONSTRAINT unique_user_poll_vote UNIQUE(poll_id, user_id, option_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON public.polls(created_by);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON public.polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_active ON public.polls(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_order ON public.poll_options(poll_id, option_order);
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON public.votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_option_id ON public.votes(option_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON public.votes(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_polls_updated_at BEFORE UPDATE ON public.polls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for polls table
-- Anyone can view active polls
CREATE POLICY "Anyone can view active polls" ON public.polls
    FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Users can view their own polls (including inactive ones)
CREATE POLICY "Users can view own polls" ON public.polls
    FOR SELECT USING (auth.uid() = created_by);

-- Authenticated users can create polls
CREATE POLICY "Authenticated users can create polls" ON public.polls
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- Users can update their own polls
CREATE POLICY "Users can update own polls" ON public.polls
    FOR UPDATE USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Users can delete their own polls
CREATE POLICY "Users can delete own polls" ON public.polls
    FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for poll_options table
-- Anyone can view options for active polls
CREATE POLICY "Anyone can view poll options" ON public.poll_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls p
            WHERE p.id = poll_options.poll_id
            AND p.is_active = true
            AND (p.expires_at IS NULL OR p.expires_at > NOW())
        )
        OR
        EXISTS (
            SELECT 1 FROM public.polls p
            WHERE p.id = poll_options.poll_id
            AND p.created_by = auth.uid()
        )
    );

-- Poll creators can insert options for their polls
CREATE POLICY "Poll creators can insert options" ON public.poll_options
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.polls p
            WHERE p.id = poll_options.poll_id
            AND p.created_by = auth.uid()
        )
    );

-- Poll creators can update options for their polls
CREATE POLICY "Poll creators can update options" ON public.poll_options
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.polls p
            WHERE p.id = poll_options.poll_id
            AND p.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.polls p
            WHERE p.id = poll_options.poll_id
            AND p.created_by = auth.uid()
        )
    );

-- Poll creators can delete options for their polls
CREATE POLICY "Poll creators can delete options" ON public.poll_options
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.polls p
            WHERE p.id = poll_options.poll_id
            AND p.created_by = auth.uid()
        )
    );

-- RLS Policies for votes table
-- Users can view votes for active polls (respecting anonymity)
CREATE POLICY "View votes for active polls" ON public.votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls p
            WHERE p.id = votes.poll_id
            AND p.is_active = true
            AND (p.expires_at IS NULL OR p.expires_at > NOW())
        )
    );

-- Poll creators can view all votes for their polls
CREATE POLICY "Poll creators can view all votes" ON public.votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls p
            WHERE p.id = votes.poll_id
            AND p.created_by = auth.uid()
        )
    );

-- Users can vote on active polls (with constraints)
CREATE POLICY "Users can vote on active polls" ON public.votes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.polls p
            WHERE p.id = votes.poll_id
            AND p.is_active = true
            AND (p.expires_at IS NULL OR p.expires_at > NOW())
        )
        AND
        EXISTS (
            SELECT 1 FROM public.poll_options po
            WHERE po.id = votes.option_id
            AND po.poll_id = votes.poll_id
        )
        AND
        (
            auth.uid() = votes.user_id
            OR
            (votes.user_id IS NULL AND EXISTS (
                SELECT 1 FROM public.polls p
                WHERE p.id = votes.poll_id
                AND p.is_anonymous = true
            ))
        )
    );

-- Function to check vote constraints
CREATE OR REPLACE FUNCTION check_vote_constraints()
RETURNS TRIGGER AS $$
DECLARE
    poll_record public.polls%ROWTYPE;
    existing_votes_count INTEGER;
BEGIN
    -- Get poll details
    SELECT * INTO poll_record FROM public.polls WHERE id = NEW.poll_id;

    -- Check if poll is active and not expired
    IF poll_record.is_active = false OR (poll_record.expires_at IS NOT NULL AND poll_record.expires_at <= NOW()) THEN
        RAISE EXCEPTION 'Cannot vote on inactive or expired poll';
    END IF;

    -- Check vote limits for authenticated users
    IF NEW.user_id IS NOT NULL THEN
        SELECT COUNT(*) INTO existing_votes_count
        FROM public.votes
        WHERE poll_id = NEW.poll_id AND user_id = NEW.user_id;

        IF poll_record.allow_multiple_votes = false AND existing_votes_count > 0 THEN
            RAISE EXCEPTION 'User has already voted on this poll';
        END IF;

        IF existing_votes_count >= poll_record.max_votes_per_user THEN
            RAISE EXCEPTION 'User has reached maximum votes for this poll';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce vote constraints
CREATE TRIGGER enforce_vote_constraints
    BEFORE INSERT ON public.votes
    FOR EACH ROW EXECUTE FUNCTION check_vote_constraints();

-- Create view for poll results
CREATE OR REPLACE VIEW poll_results AS
SELECT
    p.id as poll_id,
    p.title,
    p.description,
    p.created_at as poll_created_at,
    p.expires_at,
    p.is_active,
    po.id as option_id,
    po.option_text,
    po.option_order,
    COUNT(v.id) as vote_count,
    ROUND(
        (COUNT(v.id)::DECIMAL / NULLIF(total_votes.total, 0)) * 100, 2
    ) as vote_percentage
FROM public.polls p
LEFT JOIN public.poll_options po ON p.id = po.poll_id
LEFT JOIN public.votes v ON po.id = v.option_id
CROSS JOIN LATERAL (
    SELECT COUNT(*) as total
    FROM public.votes v2
    WHERE v2.poll_id = p.id
) as total_votes
GROUP BY p.id, p.title, p.description, p.created_at, p.expires_at, p.is_active,
         po.id, po.option_text, po.option_order, total_votes.total
ORDER BY p.created_at DESC, po.option_order ASC;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_options TO authenticated;
GRANT SELECT, INSERT ON public.votes TO authenticated;
GRANT SELECT ON poll_results TO authenticated;

-- Grant permissions to anonymous users (for anonymous voting)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.polls TO anon;
GRANT SELECT ON public.poll_options TO anon;
GRANT SELECT, INSERT ON public.votes TO anon;
GRANT SELECT ON poll_results TO anon;
