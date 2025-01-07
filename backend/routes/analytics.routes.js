import express from 'express';
import { adminRoute, protectRoute } from '../middleware/auth.middleware.js';
import { getAllAnalytics } from '../controllers/analytics.controller.js';
const router = express.Router();

router.get("/", protectRoute, adminRoute, getAllAnalytics);

export default router;