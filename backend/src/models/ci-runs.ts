import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';
import type { TestStatus } from '../types/ci-runs';

export class CiRun extends Model<InferAttributes<CiRun>, InferCreationAttributes<CiRun>> {
  declare id: CreationOptional<number>;
  declare repo: string;
  declare commit_sha: string;
  declare branch: string | null;
  declare ci_run_id: string | null;
  declare test_key: string;
  declare suite: string;
  declare name: string;
  declare status: TestStatus;
  declare duration: number | null;
  declare message: string | null;
  declare createdAt: CreationOptional<Date>;
}

CiRun.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    // repo/test_key are part of the composite index below.
    repo: { type: DataTypes.STRING(255), allowNull: false },
    commit_sha: { type: DataTypes.TEXT, allowNull: false },
    branch: { type: DataTypes.TEXT, allowNull: true },
    ci_run_id: { type: DataTypes.TEXT, allowNull: true },
    test_key: { type: DataTypes.STRING(255), allowNull: false },
    suite: { type: DataTypes.TEXT, allowNull: false },
    name: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM('passed', 'failed', 'skipped'), allowNull: false },
    duration: { type: DataTypes.REAL, allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'ci_runs',
    timestamps: true,
    updatedAt: false,
    indexes: [{ fields: ['repo', 'test_key', 'created_at'] }],
  }
);
