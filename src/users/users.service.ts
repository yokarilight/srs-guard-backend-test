import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema.js';

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

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id as string,
    email: user.email,
    name: user.name,
    role: user.role,
    preferredRoleId: user.preferredRoleId?.toString() ?? null,
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
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
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    });
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
}
