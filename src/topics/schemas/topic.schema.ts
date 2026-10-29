import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Topic {
  // 建立者，只有他能操作這個主題
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({ type: Types.ObjectId })
  currentRevisionId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type TopicDocument = HydratedDocument<Topic>;
export const TopicSchema = SchemaFactory.createForClass(Topic);
TopicSchema.index({ updatedAt: -1 });
