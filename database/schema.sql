-- ================================================
-- PORTFOLIO BACKEND DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ================================================

-- ================================================
-- 1. PERSONAL INFO TABLE
-- ================================================
CREATE TABLE personal_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  email VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  github_url VARCHAR(200),
  linkedin_url VARCHAR(200),
  leetcode_url VARCHAR(200),
  resume_url VARCHAR(200),
  bio TEXT,
  journey TEXT,
  degree VARCHAR(100),
  university VARCHAR(200),
  education_period VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ================================================
-- 2. SKILLS TABLE
-- ================================================
CREATE TABLE skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  level INTEGER CHECK (level >= 0 AND level <= 100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  icon_name VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ================================================
-- 3. PROJECTS TABLE
-- ================================================
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(500),
  category VARCHAR(100) NOT NULL,
  github_url VARCHAR(200),
  demo_url VARCHAR(200),
  technologies TEXT[], -- Array of technology names
  featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed', -- completed, in_progress, planned
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ================================================
-- 4. EXPERIENCES TABLE
-- ================================================
CREATE TABLE experiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  company VARCHAR(200) NOT NULL,
  period VARCHAR(100) NOT NULL,
  description TEXT[],
  type VARCHAR(50) NOT NULL, -- experience, education, certification
  location VARCHAR(100),
  company_url VARCHAR(200),
  sort_order INTEGER DEFAULT 0,
  is_current BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ================================================
-- 5. CONTACT MESSAGES TABLE
-- ================================================
CREATE TABLE contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'unread', -- unread, read, replied
  ip_address INET,
  user_agent TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ================================================
-- 6. ANALYTICS TABLE
-- ================================================
CREATE TABLE analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- page_view, project_click, contact_form, resume_download
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  referrer VARCHAR(500),
  country VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ================================================
-- 7. BLOG POSTS TABLE (Future feature)
-- ================================================
CREATE TABLE blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image VARCHAR(500),
  published BOOLEAN DEFAULT false,
  tags TEXT[],
  read_time INTEGER, -- estimated read time in minutes
  views INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ================================================
-- 8. TESTIMONIALS TABLE
-- ================================================
CREATE TABLE testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  position VARCHAR(200),
  company VARCHAR(200),
  content TEXT NOT NULL,
  avatar_url VARCHAR(500),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  featured BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ================================================
-- 9. SITE SETTINGS TABLE (Single row configuration)
-- ================================================
CREATE TABLE site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_mode BOOLEAN DEFAULT false,
  show_analytics BOOLEAN DEFAULT true,
  featured_sections TEXT[], -- e.g., ARRAY['projects','skills','experiences']
  hero_headline VARCHAR(200),
  hero_subheadline VARCHAR(400),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure exactly one row (application logic will enforce; optionally add a unique partial index if needed)


-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================
CREATE INDEX idx_projects_featured ON projects(featured);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_experiences_type ON experiences(type);
CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at);
CREATE INDEX idx_analytics_event_type ON analytics(event_type);
CREATE INDEX idx_analytics_created_at ON analytics(created_at);
CREATE INDEX idx_blog_posts_published ON blog_posts(published);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);

-- ================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE personal_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Public read access for portfolio data
CREATE POLICY "Public read access" ON personal_info FOR SELECT USING (true);
CREATE POLICY "Public read access" ON skills FOR SELECT USING (true);
CREATE POLICY "Public read access" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read access" ON experiences FOR SELECT USING (true);
CREATE POLICY "Public read access" ON blog_posts FOR SELECT USING (published = true);
CREATE POLICY "Public read access" ON testimonials FOR SELECT USING (approved = true);

-- Contact messages: anyone can insert, only admin can read
CREATE POLICY "Anyone can insert" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read all" ON contact_messages FOR SELECT USING (auth.jwt() ->> 'email' = current_setting('app.admin_email'));

-- Analytics: anyone can insert, only admin can read
CREATE POLICY "Anyone can insert" ON analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read all" ON analytics FOR SELECT USING (auth.jwt() ->> 'email' = current_setting('app.admin_email'));

-- Admin-only access for modifications
CREATE POLICY "Admin can modify" ON personal_info FOR ALL USING (auth.jwt() ->> 'email' = current_setting('app.admin_email'));
CREATE POLICY "Admin can modify" ON skills FOR ALL USING (auth.jwt() ->> 'email' = current_setting('app.admin_email'));
CREATE POLICY "Admin can modify" ON projects FOR ALL USING (auth.jwt() ->> 'email' = current_setting('app.admin_email'));
CREATE POLICY "Admin can modify" ON experiences FOR ALL USING (auth.jwt() ->> 'email' = current_setting('app.admin_email'));
CREATE POLICY "Admin can modify" ON blog_posts FOR ALL USING (auth.jwt() ->> 'email' = current_setting('app.admin_email'));
CREATE POLICY "Admin can modify" ON testimonials FOR ALL USING (auth.jwt() ->> 'email' = current_setting('app.admin_email'));
CREATE POLICY "Admin can modify" ON contact_messages FOR UPDATE USING (auth.jwt() ->> 'email' = current_setting('app.admin_email'));

-- ================================================
-- FUNCTIONS FOR UPDATED_AT TIMESTAMPS
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_personal_info_updated_at BEFORE UPDATE ON personal_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON experiences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON testimonials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- SAMPLE DATA INSERTION
-- ================================================

-- Insert personal info
INSERT INTO personal_info (name, title, email, location, github_url, linkedin_url, leetcode_url, bio, journey, degree, university, education_period)
VALUES (
  'Ganpat Singh',
  'Full Stack Developer & AI Enthusiast',
  'ask.gsinghr@gmail.com',
  'Jodhpur, Rajasthan (India)',
  'https://github.com/Ganpatsingh05',
  'https://linkedin.com/in/ganpatsingh05',
  'https://leetcode.com/ganpatsingh05',
  'I''m a passionate developer who loves creating innovative solutions and bringing ideas to life through code. With a strong foundation in computer science and a passion for emerging technologies, I''ve been developing web applications and exploring AI/ML for the past few years.',
  'With a strong foundation in computer science and a passion for emerging technologies, I''ve been developing web applications and exploring AI/ML for the past few years. I believe in writing clean, efficient code and creating user experiences that make a difference.',
  'Bachelor''s in Computer Science',
  'Lovely Professional University, Jalandhar (Punjab)',
  '2023-2027'
);

-- Insert skills
INSERT INTO skills (name, level, category, sort_order) VALUES
('React/Next.js', 90, 'frontend', 1),
('TypeScript', 85, 'frontend', 2),
('TailwindCSS', 88, 'frontend', 3),
('Node.js', 80, 'backend', 4),
('Python', 85, 'backend', 5),
('PostgreSQL', 75, 'backend', 6),
('MongoDB', 78, 'backend', 7),
('Git/GitHub', 90, 'tools', 8),
('Docker', 70, 'tools', 9),
('AWS', 65, 'tools', 10),
('Machine Learning', 75, 'ai-ml', 11),
('TensorFlow', 70, 'ai-ml', 12),
('Data Analysis', 80, 'ai-ml', 13);

-- Insert projects
INSERT INTO projects (title, description, category, technologies, featured, sort_order) VALUES
('E-Commerce Platform', 'Full-stack e-commerce solution with modern UI/UX and secure payment integration.', 'Web Dev', ARRAY['React', 'Node.js', 'MongoDB', 'Stripe'], true, 1),
('AI Chatbot', 'Intelligent chatbot powered by natural language processing and machine learning.', 'AI', ARRAY['Python', 'TensorFlow', 'Flask', 'NLP'], true, 2),
('Data Analytics Dashboard', 'Interactive dashboard for visualizing complex datasets with real-time updates.', 'Data Science', ARRAY['Python', 'Pandas', 'Plotly', 'Streamlit'], true, 3),
('Recommendation System', 'ML-powered recommendation engine for personalized content delivery.', 'ML', ARRAY['Python', 'Scikit-learn', 'FastAPI', 'Docker'], false, 4);

-- Insert experiences
INSERT INTO experiences (title, company, period, description, type, sort_order) VALUES
('Frontend Developer Intern', 'Tech Innovators Pvt Ltd', 'Jun 2024 - Aug 2024', ARRAY['Developed responsive web applications using React and TypeScript', 'Collaborated with design team to implement pixel-perfect UI components', 'Optimized application performance resulting in 30% faster load times'], 'experience', 1),
('Bachelor of Computer Science', 'Lovely Professional University, Jalandhar', '2023 - 2027', ARRAY['Relevant Coursework: Data Structures, Algorithms, Machine Learning, Database Systems', 'Current CGPA: 8.5/10', 'Member of Computer Science Club and AI Research Group'], 'education', 2),
('Freelance Web Developer', 'Self-Employed', 'Jan 2023 - Present', ARRAY['Built custom websites for small businesses using modern web technologies', 'Managed full project lifecycle from requirements gathering to deployment', 'Delivered 8+ projects with 100% client satisfaction rate'], 'experience', 3);

-- ================================================
-- COMPLETED! 
-- ================================================
-- Your database is now ready!
-- Next steps:
-- 1. Update your .env.local with actual Supabase credentials
-- 2. Run the Next.js API setup
-- 3. Create the admin dashboard
-- ================================================
