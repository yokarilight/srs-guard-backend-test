import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { Model } from 'mongoose';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { UsersService } from '../users/users.service.js';
import { sessionTtlMs } from './auth.constants.js';
import { Session, SessionDocument } from './schemas/session.schema.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    private readonly usersService: UsersService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ user: UserDocument; token: string; expiresAt: Date }> {
    const user = await this.usersService.findByEmail(email);
    // 帳號不存在、停用或密碼錯誤都回同一個訊息，避免被拿來探測帳號
    if (
      !user ||
      user.disabled ||
      !(await this.usersService.verifyPassword(user, password))
    ) {
      throw new UnauthorizedException('Email 或密碼錯誤');
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + sessionTtlMs());
    await this.sessionModel.create({
      tokenHash: hashToken(token),
      userId: user._id,
      expiresAt,
    });
    return { user, token, expiresAt };
  }

  async logout(token: string): Promise<void> {
    await this.sessionModel.deleteOne({ tokenHash: hashToken(token) });
  }

  /**
   * 驗證 session 並採滑動逾時：剩餘時間不到一半時延長，避免每個請求都寫 DB。
   * 回傳的 expiresAt 有變動時，呼叫端需要重發 cookie。
   */
  async authenticate(
    token: string,
  ): Promise<{
    user: UserDocument;
    session: SessionDocument;
    renewed: boolean;
  } | null> {
    const session = await this.sessionModel
      .findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } })
      .exec();
    if (!session) return null;

    const user = await this.usersService.findById(session.userId);
    if (!user || user.disabled) {
      await session.deleteOne();
      return null;
    }

    const ttl = sessionTtlMs();
    const renewed = session.expiresAt.getTime() - Date.now() < ttl / 2;
    if (renewed) {
      session.expiresAt = new Date(Date.now() + ttl);
      await session.save();
    }
    return { user, session, renewed };
  }
}
