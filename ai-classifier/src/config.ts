import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 4100,
  // Xenova/all-MiniLM-L6-v2: a small (~90MB), widely-used sentence-embedding
  // model. Classification here is nearest-exemplar cosine similarity over
  // its embeddings, not zero-shot NLI — see the comment in classifier.ts for
  // why that combination won out on this domain's error-code-heavy text.
  modelId: process.env.MODEL_ID || 'Xenova/all-MiniLM-L6-v2',
  // Unset by default (library picks its own on-disk cache next to node_modules).
  // Set in containers to a mounted volume so the downloaded model survives restarts.
  modelCacheDir: process.env.MODEL_CACHE_DIR || null,
};
