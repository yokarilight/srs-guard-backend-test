import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../auth/decorators.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import {
  type CreateTopicDto,
  createTopicSchema,
  type ListTopicsQuery,
  listTopicsQuerySchema,
  type TopicDetailView,
  type TopicListItemView,
  type UpdateTopicDto,
  updateTopicSchema,
} from './topics.dto.js';
import { TopicsService } from './topics.service.js';

@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  list(
    @CurrentUser() user: UserDocument,
    @Query(new ZodValidationPipe(listTopicsQuerySchema)) query: ListTopicsQuery,
  ): Promise<TopicListItemView[]> {
    return this.topicsService.list(user, query);
  }

  @Post()
  create(
    @CurrentUser() user: UserDocument,
    @Body(new ZodValidationPipe(createTopicSchema)) body: CreateTopicDto,
  ): Promise<TopicDetailView> {
    return this.topicsService.create(user, body);
  }

  @Get(':topicId')
  findOne(
    @CurrentUser() user: UserDocument,
    @Param('topicId', ParseObjectIdPipe) topicId: Types.ObjectId,
  ): Promise<TopicDetailView> {
    return this.topicsService.findOne(user, topicId);
  }

  @Patch(':topicId')
  update(
    @CurrentUser() user: UserDocument,
    @Param('topicId', ParseObjectIdPipe) topicId: Types.ObjectId,
    @Body(new ZodValidationPipe(updateTopicSchema)) body: UpdateTopicDto,
  ): Promise<TopicDetailView> {
    return this.topicsService.update(user, topicId, body);
  }

  @Delete(':topicId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: UserDocument,
    @Param('topicId', ParseObjectIdPipe) topicId: Types.ObjectId,
  ): Promise<void> {
    return this.topicsService.remove(user, topicId);
  }
}
