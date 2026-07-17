import { sequelize } from '../src/db/sequelize';
import '../src/models/ci-runs';
import '../src/models/user';
import '../src/models/api-token';

async function main() {
  await sequelize.authenticate();
  await sequelize.sync();
  console.log('database and tables are up to date');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
