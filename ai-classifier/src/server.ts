import cors from 'cors';
import express from 'express';

import { config } from './config.js';
import { warmUpClassifier } from './classifier.js';
import { classifyRouter } from './routes/classify.js';
import { healthRouter } from './routes/health.js';

export const app = express();

app.use(cors());
app.use(express.json());
app.use(healthRouter);
app.use(classifyRouter);

app.listen(config.port, () => {
  console.log(`ai-classifier listening on http://localhost:${config.port}`);
  warmUpClassifier();
});
