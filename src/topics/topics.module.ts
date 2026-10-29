import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RevisionsModule } from '../revisions/revisions.module.js';
import { UsersModule } from '../users/users.module.js';
import { Topic, TopicSchema } from './schemas/topic.schema.js';
import { TopicsController } from './topics.controller.js';
import { TopicsService } from './topics.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Topic.name, schema: TopicSchema }]),
    UsersModule,
    RevisionsModule,
  ],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
