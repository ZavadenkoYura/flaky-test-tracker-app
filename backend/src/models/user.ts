import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

export type Plan = 'free' | 'pro';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare github_id: string;
  declare username: string;
  declare display_name: string;
  declare avatar_url: string | null;
  declare access_token: string;
  declare plan: CreationOptional<Plan>;
  declare stripe_customer_id: string | null;
  declare stripe_subscription_id: string | null;
  declare plan_renews_at: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    github_id: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    username: { type: DataTypes.TEXT, allowNull: false },
    display_name: { type: DataTypes.TEXT, allowNull: false },
    avatar_url: { type: DataTypes.TEXT, allowNull: true },
    // Plaintext for now (matches the project's v1 scope) — revisit if this
    // moves beyond a handful of trusted users.
    access_token: { type: DataTypes.TEXT, allowNull: false },
    plan: { type: DataTypes.ENUM('free', 'pro'), allowNull: false, defaultValue: 'free' },
    stripe_customer_id: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    stripe_subscription_id: { type: DataTypes.TEXT, allowNull: true },
    plan_renews_at: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
  }
);
