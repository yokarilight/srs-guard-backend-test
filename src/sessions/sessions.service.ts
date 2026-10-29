import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { Model, Types } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionTtlMs(): number {
  const hours = Number(process.env.SESSION_TTL_HOURS ?? 8);
  return (Number.isFinite(hours) && hours > 0 ? hours : 8) * 60 * 60 * 1000;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
  ) {}

  async create(
    userId: Types.ObjectId,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + sessionTtlMs());
    await this.sessionModel.create({
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    });
    return { token, expiresAt };
  }

  findValid(token: string): Promise<SessionDocument | null> {
    return this.sessionModel
      .findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } })
      .exec();
  }

  /**
   * 滑動逾時：剩餘時間不到一半時延長，避免每個請求都寫 DB。
   * 回傳 true 表示有延長，呼叫端需要重發 cookie。
   */
  async touch(session: SessionDocument): Promise<boolean> {
    const ttl = sessionTtlMs();
    if (session.expiresAt.getTime() - Date.now() >= ttl / 2) return false;
    session.expiresAt = new Date(Date.now() + ttl);
    await session.save();
    return true;
  }

  async revoke(token: string): Promise<void> {
    await this.sessionModel.deleteOne({ tokenHash: hashToken(token) });
  }

  // 停用帳號、重設或修改密碼時讓既有登入失效
  async revokeAllForUser(
    userId: Types.ObjectId,
    exceptSessionId?: Types.ObjectId,
  ): Promise<void> {
    await this.sessionModel.deleteMany({
      userId,
      ...(exceptSessionId ? { _id: { $ne: exceptSessionId } } : {}),
    });
  }
}
