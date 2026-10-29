import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Revision, RevisionDocument } from './schemas/revision.schema.js';

@Injectable()
export class RevisionsService {
  constructor(
    @InjectModel(Revision.name) private readonly revisionModel: Model<Revision>,
  ) {}

  findByIds(ids: Types.ObjectId[]): Promise<RevisionDocument[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.revisionModel.find({ _id: { $in: ids } }).exec();
  }

  findByTopic(topicId: Types.ObjectId): Promise<RevisionDocument[]> {
    return this.revisionModel.find({ topicId }).sort({ version: -1 }).exec();
  }

  /**
   * 刪除主題時連帶刪除所有版本。
   * 之後的模組（GridFS 檔案、問題、對話、角色文件、AiRun）也要在這裡一併清掉。
   */
  async removeByTopic(topicId: Types.ObjectId): Promise<void> {
    await this.revisionModel.deleteMany({ topicId });
  }
}
