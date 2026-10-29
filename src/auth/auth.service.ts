import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { SessionDocument } from '../sessions/schemas/session.schema.js';
import { SessionsService } from '../sessions/sessions.service.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly sessionsService: SessionsService,
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
    const { token, expiresAt } = await this.sessionsService.create(user._id);
    return { user, token, expiresAt };
  }

  logout(token: string): Promise<void> {
    return this.sessionsService.revoke(token);
  }

  async authenticate(token: string): Promise<{
    user: UserDocument;
    session: SessionDocument;
    renewed: boolean;
  } | null> {
    const session = await this.sessionsService.findValid(token);
    if (!session) return null;

    const user = await this.usersService.findById(session.userId);
    if (!user || user.disabled) {
      await session.deleteOne();
      return null;
    }

    const renewed = await this.sessionsService.touch(session);
    return { user, session, renewed };
  }
}
