import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config';

export const app = express();
const PORT = config.port;
const PREFIX = '/api/v1';

app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());

app.get(`${PREFIX}/health`, (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`flaky-test-tracker listening on :${PORT}`);
});
