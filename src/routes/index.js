import { Router } from 'express';
import { ingest, processContent, publish, publishFromUrl } from '../controllers/contentController.js';

const router = Router();

router.post('/ingest', ingest);
router.post('/process', processContent);
router.post('/publish', publish);
router.post('/pipeline/publish-from-url', publishFromUrl);

export default router;