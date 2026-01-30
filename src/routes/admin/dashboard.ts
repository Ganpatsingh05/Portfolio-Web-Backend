import { Router, Request, Response } from 'express';
import supabase from '../../lib/supabase';
import { authenticateAdmin } from '../auth';

const router = Router();

interface DashboardStats {
  totalProjects: number;
  totalSkills: number;
  totalExperiences: number;
  totalMessages: number;
  unreadMessages: number;
  recentMessages: any[];
  projectsByCategory: Record<string, number>;
  skillsByCategory: Record<string, number>;
}

// GET /dashboard/stats - Get dashboard statistics
router.get('/stats', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    // Parallel fetch all counts
    const [
      projectsResult,
      skillsResult,
      experiencesResult,
      messagesResult,
      unreadMessagesResult,
      recentMessagesResult
    ] = await Promise.all([
      supabase.from('projects').select('id, category', { count: 'exact' }),
      supabase.from('skills').select('id, category', { count: 'exact' }),
      supabase.from('experiences').select('id', { count: 'exact' }),
      supabase.from('messages').select('id', { count: 'exact' }),
      supabase.from('messages').select('id', { count: 'exact' }).eq('read', false),
      supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(5)
    ]);

    // Calculate projects by category
    const projectsByCategory: Record<string, number> = {};
    projectsResult.data?.forEach((project: any) => {
      const cat = project.category || 'Uncategorized';
      projectsByCategory[cat] = (projectsByCategory[cat] || 0) + 1;
    });

    // Calculate skills by category
    const skillsByCategory: Record<string, number> = {};
    skillsResult.data?.forEach((skill: any) => {
      const cat = skill.category || 'Uncategorized';
      skillsByCategory[cat] = (skillsByCategory[cat] || 0) + 1;
    });

    const stats: DashboardStats = {
      totalProjects: projectsResult.count || 0,
      totalSkills: skillsResult.count || 0,
      totalExperiences: experiencesResult.count || 0,
      totalMessages: messagesResult.count || 0,
      unreadMessages: unreadMessagesResult.count || 0,
      recentMessages: recentMessagesResult.data || [],
      projectsByCategory,
      skillsByCategory
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// GET /dashboard/activity - Get recent activity
router.get('/activity', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Get recent items from each table
    const [
      recentProjects,
      recentSkills,
      recentExperiences,
      recentMessages
    ] = await Promise.all([
      supabase.from('projects').select('id, title, created_at, updated_at').order('updated_at', { ascending: false }).limit(limit),
      supabase.from('skills').select('id, name, created_at, updated_at').order('updated_at', { ascending: false }).limit(limit),
      supabase.from('experiences').select('id, company, created_at, updated_at').order('updated_at', { ascending: false }).limit(limit),
      supabase.from('messages').select('id, name, email, created_at').order('created_at', { ascending: false }).limit(limit)
    ]);

    // Combine and sort by date
    const activities = [
      ...(recentProjects.data || []).map((p: any) => ({ type: 'project', item: p, date: p.updated_at || p.created_at })),
      ...(recentSkills.data || []).map((s: any) => ({ type: 'skill', item: s, date: s.updated_at || s.created_at })),
      ...(recentExperiences.data || []).map((e: any) => ({ type: 'experience', item: e, date: e.updated_at || e.created_at })),
      ...(recentMessages.data || []).map((m: any) => ({ type: 'message', item: m, date: m.created_at }))
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

export default router;
