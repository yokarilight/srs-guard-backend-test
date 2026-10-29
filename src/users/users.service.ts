import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { SessionsService } from '../sessions/sessions.service.js';
import { User, UserDocument, UserRole } from './schemas/user.schema.js';
import type { UpdateMeDto, UpdateUserDto } from './users.dto.js';

const BCRYPT_ROUNDS = 12;

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  preferredRoleId: string | null;
}

// 使用者管理頁用，多了停用狀態與建立時間
export interface AdminUserView extends PublicUser {
  disabled: boolean;
  createdAt: Date;
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id as string,
    email: user.email,
    name: user.name,
    role: user.role,
    preferredRoleId: user.preferredRoleId?.toString() ?? null,
  };
}

export function toAdminUserView(user: UserDocument): AdminUserView {
  return {
    ...toPublicUser(user),
    disabled: user.disabled,
    createdAt: user.createdAt,
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly sessionsService: SessionsService,
  ) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    const email = input.email.trim().toLowerCase();
    if (await this.userModel.exists({ email })) {
      throw new ConflictException('此 Email 已被使用');
    }
    return this.userModel.create({
      email,
      name: input.name,
      role: input.role ?? 'user',
      passwordHash: await hashPassword(input.password),
    });
  }

  findAll(): Promise<UserDocument[]> {
    return this.userModel.find().sort({ createdAt: 1 }).exec();
  }

  findById(id: Types.ObjectId | string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  findByIds(ids: Types.ObjectId[]): Promise<UserDocument[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.userModel.find({ _id: { $in: ids } }).exec();
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).exec();
  }

  verifyPassword(user: UserDocument, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async adminUpdate(
    admin: UserDocument,
    userId: Types.ObjectId,
    dto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('找不到此使用者');

    // 管理者不能把自己停用或降級，確保系統裡至少留著一位能登入的管理者
    if (user._id.equals(admin._id)) {
      if (dto.disabled === true) {
        throw new BadRequestException('不可停用自己的帳號');
      }
      if (dto.role !== undefined && dto.role !== 'admin') {
        throw new BadRequestException('不可移除自己的管理者權限');
      }
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.disabled !== undefined) user.disabled = dto.disabled;
    if (dto.password !== undefined) {
      user.passwordHash = await hashPassword(dto.password);
    }
    await user.save();

    if (dto.disabled === true || dto.password !== undefined) {
      await this.sessionsService.revokeAllForUser(user._id);
    }
    return user;
  }

  async updateMe(user: UserDocument, dto: UpdateMeDto): Promise<UserDocument> {
    // TODO(F5): 角色模組完成後，確認 preferredRoleId 對應到存在的角色
    user.preferredRoleId =
      dto.preferredRoleId === null
        ? undefined
        : new Types.ObjectId(dto.preferredRoleId);
    await user.save();
    return user;
  }

  /** 修改自己的密碼；保留目前這個 session，其他裝置的登入全部失效。 */
  async changePassword(
    user: UserDocument,
    currentPassword: string,
    newPassword: string,
    currentSessionId: Types.ObjectId,
  ): Promise<void> {
    if (!(await this.verifyPassword(user, currentPassword))) {
      throw new BadRequestException('目前的密碼錯誤');
    }
    user.passwordHash = await hashPassword(newPassword);
    await user.save();
    await this.sessionsService.revokeAllForUser(user._id, currentSessionId);
  }
}

function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
