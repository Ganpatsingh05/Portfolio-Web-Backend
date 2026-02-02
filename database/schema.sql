-- =====================================================
-- PORTFOLIO DATABASE SCHEMA
-- Supabase PostgreSQL Schema for Portfolio Application
-- Version: 2.0
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PERSONAL INFO TABLE
-- Stores portfolio owner's personal information
-- =====================================================
CREATE TABLE IF NOT EXISTS personal_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    location VARCHAR(255),
    bio TEXT,
    journey TEXT,
    degree VARCHAR(255),
    university VARCHAR(255),
    education_period VARCHAR(100),
    years_of_experience INTEGER DEFAULT 0,
    website_url VARCHAR(500),
    github_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    twitter_url VARCHAR(500),
    leetcode_url VARCHAR(500),
    resume_url VARCHAR(500),
    profile_image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. HERO SECTION TABLE
-- Hero/landing section customization
-- =====================================================
CREATE TABLE IF NOT EXISTS hero_section (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    greeting VARCHAR(255) DEFAULT 'Hello, I''m',
    name VARCHAR(255) NOT NULL,
    titles TEXT[] DEFAULT ARRAY['Full Stack Developer'],
    description TEXT,
    cta_text VARCHAR(255) DEFAULT 'Get In Touch',
    cta_link VARCHAR(255) DEFAULT '#contact',
    background_animation VARCHAR(100),
    social_links JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. PROJECTS TABLE
-- Portfolio projects showcase
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(500),
    category VARCHAR(100) DEFAULT 'Web Dev',
    technologies TEXT[] DEFAULT ARRAY[]::TEXT[],
    demo_url VARCHAR(500),
    github_url VARCHAR(500),
    featured BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('completed', 'in-progress', 'planning')),
    sort_order INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. SKILLS TABLE
-- Technical skills and expertise
-- =====================================================
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    level INTEGER DEFAULT 0 CHECK (level >= 0 AND level <= 100),
    category VARCHAR(100) NOT NULL CHECK (category IN ('frontend', 'backend', 'tools', 'ai-ml', 'other', 'custom')),
    icon_name VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. EXPERIENCES TABLE
-- Work experience and education
-- =====================================================
CREATE TABLE IF NOT EXISTS experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    period VARCHAR(100) NOT NULL,
    description TEXT[],
    type VARCHAR(50) NOT NULL CHECK (type IN ('experience', 'education')),
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    location VARCHAR(255),
    company_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    is_current BOOLEAN DEFAULT false,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. CONTACT MESSAGES TABLE
-- Contact form submissions
-- =====================================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    message TEXT NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. ANALYTICS TABLE
-- Page views and event tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL DEFAULT 'page_view',
    page VARCHAR(255),
    ip_address VARCHAR(50),
    user_agent TEXT,
    referrer TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. SETTINGS TABLE
-- Site configuration settings (key-value store)
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON projects(sort_order);

-- Skills indexes
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_sort_order ON skills(sort_order);
CREATE INDEX IF NOT EXISTS idx_skills_featured ON skills(is_featured);

-- Experiences indexes
CREATE INDEX IF NOT EXISTS idx_experiences_type ON experiences(type);
CREATE INDEX IF NOT EXISTS idx_experiences_sort_order ON experiences(sort_order);
CREATE INDEX IF NOT EXISTS idx_experiences_start_date ON experiences(start_date);

-- Contact messages indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_page ON analytics(page);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);

-- Settings index
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE personal_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_section ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public read access policies (for frontend)
CREATE POLICY "Public read personal_info" ON personal_info FOR SELECT USING (true);
CREATE POLICY "Public read hero_section" ON hero_section FOR SELECT USING (true);
CREATE POLICY "Public read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read skills" ON skills FOR SELECT USING (true);
CREATE POLICY "Public read experiences" ON experiences FOR SELECT USING (true);

-- Public insert for contact messages and analytics
CREATE POLICY "Public insert contact_messages" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert analytics" ON analytics FOR INSERT WITH CHECK (true);

-- Service role has full access (for backend with service key)
CREATE POLICY "Service full access personal_info" ON personal_info FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access hero_section" ON hero_section FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access projects" ON projects FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access skills" ON skills FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access experiences" ON experiences FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access contact_messages" ON contact_messages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access analytics" ON analytics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access settings" ON settings FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_personal_info_updated_at BEFORE UPDATE ON personal_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hero_section_updated_at BEFORE UPDATE ON hero_section FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON experiences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_messages_updated_at BEFORE UPDATE ON contact_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA (Optional - Default personal info)
-- =====================================================
INSERT INTO personal_info (name, title, email, location, bio, journey)
VALUES (
    'Ganpat Singh',
    'Full Stack Developer',
    'contact@example.com',
    'India',
    'A passionate full-stack developer with expertise in building modern web applications.',
    'My journey in tech started with curiosity and has evolved into a passion for creating impactful solutions.'
) ON CONFLICT DO NOTHING;

INSERT INTO hero_section (greeting, name, titles, description, cta_text, cta_link)
VALUES (
    'Hello, I''m',
    'Ganpat Singh',
    ARRAY['Full Stack Developer', 'AI Enthusiast', 'Problem Solver'],
    'Building innovative digital experiences with modern technologies',
    'Get In Touch',
    '#contact'
) ON CONFLICT DO NOTHING;

-- Default settings
INSERT INTO settings (key, value) VALUES 
    ('site_title', '"Ganpat Singh - Portfolio"'),
    ('site_description', '"Full Stack Developer Portfolio"'),
    ('theme', '"system"'),
    ('analytics_enabled', 'true'),
    ('contact_email', '"contact@example.com"')
ON CONFLICT (key) DO NOTHING;
