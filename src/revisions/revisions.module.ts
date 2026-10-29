import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RevisionsService } from './revisions.service.js';
import { Revision, RevisionSchema } from './schemas/revision.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Revision.name, schema: RevisionSchema },
    ]),
  ],
  providers: [RevisionsService],
  exports: [RevisionsService],
})
export class RevisionsModule {}
