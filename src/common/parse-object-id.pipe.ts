import { NotFoundException, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

// 不合法的 id 一律視為找不到，避免洩漏內部格式
export class ParseObjectIdPipe implements PipeTransform<
  string,
  Types.ObjectId
> {
  transform(value: string): Types.ObjectId {
    if (
      !Types.ObjectId.isValid(value) ||
      String(new Types.ObjectId(value)) !== value
    ) {
      throw new NotFoundException();
    }
    return new Types.ObjectId(value);
  }
}
