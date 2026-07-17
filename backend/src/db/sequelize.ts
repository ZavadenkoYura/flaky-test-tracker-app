import { Sequelize } from 'sequelize';
import { config } from '../config';

const dialectOptions = config.db.ssl
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : undefined;

export const sequelize = config.db.url
  ? new Sequelize(config.db.url, { dialect: 'postgres', logging: false, dialectOptions })
  : new Sequelize({
      dialect: 'postgres',
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      username: config.db.username,
      password: config.db.password,
      logging: false,
      dialectOptions,
    });
