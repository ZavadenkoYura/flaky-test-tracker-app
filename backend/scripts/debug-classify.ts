import 'dotenv/config';
import { classifyFailure } from '../src/services/ai-classifier';

async function main() {
  const result = await classifyFailure({
    name: 'rejects bad password',
    suite: 'AuthTests',
    message: 'connect ECONNREFUSED 127.0.0.1:5432 while waiting for auth service',
  });
  console.log(result);
}

main();
