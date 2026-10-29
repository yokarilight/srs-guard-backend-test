import { z } from 'zod';
import type { RevisionStatus } from '../revisions/schemas/revision.schema.js';

export const TOPIC_NAME_MAX = 100;
export const TOPIC_DESCRIPTION_MAX = 2000;

const name = z
  .string()
  .trim()
  .min(1, '請輸入主題名稱')
  .max(TOPIC_NAME_MAX, `主題名稱不可超過 ${TOPIC_NAME_MAX} 字`);
const description = z
  .string()
  .trim()
  .max(TOPIC_DESCRIPTION_MAX, `描述不可超過 ${TOPIC_DESCRIPTION_MAX} 字`);

export const createTopicSchema = z.object({
  name,
  description: description.optional(),
});
export type CreateTopicDto = z.infer<typeof createTopicSchema>;

export const updateTopicSchema = z
  .object({ name: name.optional(), description: description.optional() })
  .refine((v) => v.name !== undefined || v.description !== undefined, {
    message: '至少需要修改名稱或描述',
  });
export type UpdateTopicDto = z.infer<typeof updateTopicSchema>;

export const listTopicsQuerySchema = z.object({
  scope: z.enum(['all', 'mine']).default('all'),
});
export type ListTopicsQuery = z.infer<typeof listTopicsQuerySchema>;

export interface TopicOwnerView {
  id: string;
  name: string;
}

export interface RevisionSummaryView {
  id: string;
  version: number;
  status: RevisionStatus;
  createdAt: Date;
}

export interface TopicListItemView {
  id: string;
  name: string;
  description: string;
  owner: TopicOwnerView;
  // 尚未上傳 SRS 時為 null
  currentRevision: RevisionSummaryView | null;
  isOwner: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicDetailView extends TopicListItemView {
  // 版本切換下拉選單用，新版在前
  revisions: RevisionSummaryView[];
}
