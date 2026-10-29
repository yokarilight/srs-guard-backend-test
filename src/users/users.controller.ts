import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminGuard } from '../auth/admin.guard.js';
import { CurrentUser } from '../auth/decorators.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { UserDocument } from './schemas/user.schema.js';
import {
  type CreateUserDto,
  createUserSchema,
  type UpdateUserDto,
  updateUserSchema,
} from './users.dto.js';
import {
  type AdminUserView,
  toAdminUserView,
  UsersService,
} from './users.service.js';

// 使用者管理（F8-2），僅限管理者
@Controller('users')
@UseGuards(AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(): Promise<AdminUserView[]> {
    const users = await this.usersService.findAll();
    return users.map(toAdminUserView);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserDto,
  ): Promise<AdminUserView> {
    return toAdminUserView(await this.usersService.create(body));
  }

  @Patch(':userId')
  async update(
    @CurrentUser() admin: UserDocument,
    @Param('userId', ParseObjectIdPipe) userId: Types.ObjectId,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserDto,
  ): Promise<AdminUserView> {
    return toAdminUserView(
      await this.usersService.adminUpdate(admin, userId, body),
    );
  }
}
