import { Body, Controller, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { UserDocument } from './schemas/user.schema.js';
import { type UpdateMeDto, updateMeSchema } from './users.dto.js';
import {
  type PublicUser,
  toPublicUser,
  UsersService,
} from './users.service.js';

// 個人設定（F8-6）
@Controller('me')
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Patch()
  async update(
    @CurrentUser() user: UserDocument,
    @Body(new ZodValidationPipe(updateMeSchema)) body: UpdateMeDto,
  ): Promise<PublicUser> {
    return toPublicUser(await this.usersService.updateMe(user, body));
  }
}
