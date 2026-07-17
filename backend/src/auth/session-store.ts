import session from 'express-session';
import SequelizeStoreFactory from 'connect-session-sequelize';
import { sequelize } from '../db/sequelize';

const SequelizeStore = SequelizeStoreFactory(session.Store);

// Persists sessions in the same sqlite db as everything else, so a
// tsx-watch restart (or any server restart) doesn't silently log everyone
// out the way the default in-memory MemoryStore does.
export const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'sessions',
});
