import { Router } from 'express';

// Import admin route modules
import projectsRouter from './projects';
import skillsRouter from './skills';
import experiencesRouter from './experiences';
import messagesRouter from './messages';
import personalRouter from './personal';
import settingsRouter from './settings';
import dashboardRouter from './dashboard';
import heroRouter from './hero';

const router = Router();

// Mount admin routes
router.use('/projects', projectsRouter);
router.use('/skills', skillsRouter);
router.use('/experiences', experiencesRouter);
router.use('/messages', messagesRouter);
router.use('/personal-info', personalRouter);
router.use('/settings', settingsRouter);
router.use('/dashboard', dashboardRouter);
router.use('/hero', heroRouter);

export default router;
