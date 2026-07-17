import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class ApiToken extends Model<InferAttributes<ApiToken>, InferCreationAttributes<ApiToken>> {
  declare id: CreationOptional<number>;
  declare user_id: number;
  declare repo: string;
  declare name: string | null;
  // SHA-256 hex digest of the raw token — the raw value is shown to the
  // user exactly once at creation time and never persisted.
  declare token_hash: string;
  declare last_four: string;
  declare last_used_at: Date | null;
  declare createdAt: CreationOptional<Date>;
}

ApiToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    repo: { type: DataTypes.TEXT, allowNull: false },
    name: { type: DataTypes.TEXT, allowNull: true },
    // A sha256 hex digest is always exactly 64 characters.
    token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    last_four: { type: DataTypes.STRING(4), allowNull: false },
    last_used_at: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'api_tokens',
    timestamps: true,
    updatedAt: false,
    indexes: [{ fields: ['user_id'] }, { fields: ['token_hash'], unique: true }],
  }
);
