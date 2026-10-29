import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RevisionsService } from '../revisions/revisions.service.js';
import type { RevisionDocument } from '../revisions/schemas/revision.schema.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { UsersService } from '../users/users.service.js';
import { Topic, TopicDocument } from './schemas/topic.schema.js';
import type {
  CreateTopicDto,
  ListTopicsQuery,
  RevisionSummaryView,
  TopicDetailView,
  TopicListItemView,
  UpdateTopicDto,
} from './topics.dto.js';

function toRevisionSummary(revision: RevisionDocument): RevisionSummaryView {
  return {
    id: revision.id as string,
    version: revision.version,
    status: revision.status,
    createdAt: revision.createdAt,
  };
}

@Injectable()
export class TopicsService {
  constructor(
    @InjectModel(Topic.name) private readonly topicModel: Model<Topic>,
    private readonly usersService: UsersService,
    private readonly revisionsService: RevisionsService,
  ) {}

  async create(
    user: UserDocument,
    dto: CreateTopicDto,
  ): Promise<TopicDetailView> {
    const topic = await this.topicModel.create({
      ownerId: user._id,
      name: dto.name,
      description: dto.description ?? '',
    });
    return { ...(await this.toListItem(topic, user)), revisions: [] };
  }

  async list(
    user: UserDocument,
    query: ListTopicsQuery,
  ): Promise<TopicListItemView[]> {
    const filter = query.scope === 'mine' ? { ownerId: user._id } : {};
    const topics = await this.topicModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .exec();

    const [owners, revisions] = await Promise.all([
      this.usersService.findByIds(uniqueIds(topics.map((t) => t.ownerId))),
      this.revisionsService.findByIds(
        topics.flatMap((t) =>
          t.currentRevisionId ? [t.currentRevisionId] : [],
        ),
      ),
    ]);
    const ownerById = new Map(owners.map((o) => [o.id as string, o]));
    const revisionById = new Map(revisions.map((r) => [r.id as string, r]));

    return topics.map((topic) =>
      this.buildListItem(
        topic,
        user,
        ownerById.get(topic.ownerId.toString()),
        topic.currentRevisionId
          ? revisionById.get(topic.currentRevisionId.toString())
          : undefined,
      ),
    );
  }

  async findOne(
    user: UserDocument,
    topicId: Types.ObjectId,
  ): Promise<TopicDetailView> {
    const topic = await this.getTopicOrThrow(topicId);
    const [item, revisions] = await Promise.all([
      this.toListItem(topic, user),
      this.revisionsService.findByTopic(topic._id),
    ]);
    return { ...item, revisions: revisions.map(toRevisionSummary) };
  }

  async update(
    user: UserDocument,
    topicId: Types.ObjectId,
    dto: UpdateTopicDto,
  ): Promise<TopicDetailView> {
    const topic = await this.getOwnedTopicOrThrow(user, topicId);
    if (dto.name !== undefined) topic.name = dto.name;
    if (dto.description !== undefined) topic.description = dto.description;
    await topic.save();
    return this.findOne(user, topic._id);
  }

  async remove(user: UserDocument, topicId: Types.ObjectId): Promise<void> {
    const topic = await this.getOwnedTopicOrThrow(user, topicId);
    // 先刪版本與其底下的資料，再刪主題；中途失敗時主題仍在，可再刪一次
    await this.revisionsService.removeByTopic(topic._id);
    await topic.deleteOne();
  }

  async getTopicOrThrow(topicId: Types.ObjectId): Promise<TopicDocument> {
    const topic = await this.topicModel.findById(topicId).exec();
    if (!topic) throw new NotFoundException('找不到此主題');
    return topic;
  }

  async getOwnedTopicOrThrow(
    user: UserDocument,
    topicId: Types.ObjectId,
  ): Promise<TopicDocument> {
    const topic = await this.getTopicOrThrow(topicId);
    if (!topic.ownerId.equals(user._id)) {
      throw new ForbiddenException('只有主題建立者可以執行此操作');
    }
    return topic;
  }

  private async toListItem(
    topic: TopicDocument,
    user: UserDocument,
  ): Promise<TopicListItemView> {
    const [owners, revisions] = await Promise.all([
      this.usersService.findByIds([topic.ownerId]),
      this.revisionsService.findByIds(
        topic.currentRevisionId ? [topic.currentRevisionId] : [],
      ),
    ]);
    return this.buildListItem(topic, user, owners[0], revisions[0]);
  }

  private buildListItem(
    topic: TopicDocument,
    user: UserDocument,
    owner: UserDocument | undefined,
    currentRevision: RevisionDocument | undefined,
  ): TopicListItemView {
    return {
      id: topic.id as string,
      name: topic.name,
      description: topic.description,
      owner: {
        id: topic.ownerId.toString(),
        name: owner?.name ?? '（已刪除的使用者）',
      },
      currentRevision: currentRevision
        ? toRevisionSummary(currentRevision)
        : null,
      isOwner: topic.ownerId.equals(user._id),
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    };
  }
}

function uniqueIds(ids: Types.ObjectId[]): Types.ObjectId[] {
  return [...new Map(ids.map((id) => [id.toString(), id])).values()];
}
