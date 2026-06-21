import { Router } from 'express';
import * as controller from '../controllers/index.js';
import { validateQueryParams, validateId, validateClassificacao } from '../middlewares/validation.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import authRoutes from './authRoutes.js';
import webhookRoutes from './webhookRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/webhook', webhookRoutes);

// GET /api/health
router.get('/health', asyncHandler(controller.getHealth));

// GET /api/status
router.get('/status', asyncHandler(controller.getStatus));

// GET /api/leads?limit=&offset=&classificacao=&segmento=
router.get('/leads', validateQueryParams, asyncHandler(controller.getLeads));

// GET /api/leads/classificacao/:tipo — deve vir antes de /leads/:id
router.get('/leads/classificacao/:tipo', validateClassificacao, asyncHandler(controller.getLeadsByClassificacao));

// GET /api/leads/:id
router.get('/leads/:id', validateId, asyncHandler(controller.getLead));

export default router;
