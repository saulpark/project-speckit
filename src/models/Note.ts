import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INoteContent {
  type: 'delta' | 'plain';
  data: any; // Delta JSON or plain string
  preview?: string;
}

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  content: INoteContent;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface INoteModel extends Model<INote> {}

const noteSchema = new Schema<INote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      maxlength: 200,
      trim: true,
      default: 'Untitled',
    },
    content: {
      type: {
        type: String,
        enum: ['delta', 'plain'],
        default: 'delta',
      },
      data: Schema.Types.Mixed,
      preview: String,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ userId: 1, updatedAt: -1 });
noteSchema.index({ userId: 1, title: 'text', 'content.preview': 'text' });
noteSchema.index({ isPublic: 1, updatedAt: -1 });

export const Note: INoteModel = mongoose.model<INote, INoteModel>('Note', noteSchema);
