import { Schema, model, Document } from 'mongoose';

export interface IDatabaseCredential extends Document {
  userId: string;
  name: string;
  type: 'mongodb' | 'postgresql' | 'redis';
  host: string;
  port: number;
  database?: string;
  username?: string;
  encryptedPassword?: string;
  encryptedConnectionString?: string;
  isDefault: boolean;
  lastUsed?: Date;
  lastTested?: Date;
  testStatus?: 'success' | 'failed';
  testMessage?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const databaseCredentialSchema = new Schema<IDatabaseCredential>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['mongodb', 'postgresql', 'redis'],
    required: true
  },
  host: {
    type: String,
    required: true
  },
  port: {
    type: Number,
    required: true
  },
  database: String,
  username: String,
  encryptedPassword: String,
  encryptedConnectionString: String,
  isDefault: {
    type: Boolean,
    default: false
  },
  lastUsed: Date,
  lastTested: Date,
  testStatus: {
    type: String,
    enum: ['success', 'failed']
  },
  testMessage: String,
  tags: [String]
}, {
  timestamps: true
});

// Compound index for user's named credentials
databaseCredentialSchema.index({ userId: 1, name: 1 }, { unique: true });

// Index for finding default credential
databaseCredentialSchema.index({ userId: 1, type: 1, isDefault: 1 });

export const DatabaseCredential = model<IDatabaseCredential>('DatabaseCredential', databaseCredentialSchema);