import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const REVISION_STATUSES = [
  'draft',
  'reviewing',
  'clarifying',
  'clarified',
  'generating',
  'completed',
  'failed',
] as const;
export type RevisionStatus = (typeof REVISION_STATUSES)[number];

@Schema({ _id: false })
export class FigmaScreen {
  @Prop({ type: Types.ObjectId, required: true })
  fileId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;
}

@Schema({ _id: false })
export class FigmaLink {
  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ trim: true })
  label?: string;
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Revision {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  topicId: Types.ObjectId;

  @Prop({ required: true })
  version: number;

  @Prop({ type: String, enum: REVISION_STATUSES, default: 'draft' })
  status: RevisionStatus;

  @Prop({ type: Types.ObjectId })
  srsFileId?: Types.ObjectId;

  @Prop()
  srsPageCount?: number;

  @Prop({ type: [SchemaFactory.createForClass(FigmaScreen)], default: [] })
  figmaScreens: FigmaScreen[];

  @Prop({ type: [SchemaFactory.createForClass(FigmaLink)], default: [] })
  figmaLinks: FigmaLink[];

  @Prop({ type: [Types.ObjectId], default: [] })
  selectedRoleIds: Types.ObjectId[];

  createdAt: Date;
}

export type RevisionDocument = HydratedDocument<Revision>;
export const RevisionSchema = SchemaFactory.createForClass(Revision);
RevisionSchema.index({ topicId: 1, version: 1 }, { unique: true });
