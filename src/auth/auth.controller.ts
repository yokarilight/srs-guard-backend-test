import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import {
  type ChangePasswordDto,
  changePasswordSchema,
} from '../users/users.dto.js';
import {
  type PublicUser,
  toPublicUser,
  UsersService,
} from '../users/users.service.js';
import { AUTH_RATE_LIMIT, SESSION_COOKIE } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import { CurrentSessionId, CurrentUser, Public } from './decorators.js';
import { clearSessionCookie, setSessionCookie } from './session-cookie.js';

const loginSchema = z.object({
  email: z.email('Email 格式錯誤'),
  password: z.string().min(1, '請輸入密碼'),
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMIT)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.infer<typeof loginSchema>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const { user, token, expiresAt } = await this.authService.login(
      body.email,
      body.password,
    );
    setSessionCookie(res, token, expiresAt);
    return toPublicUser(user);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = (req.cookies as Record<string, string>)[SESSION_COOKIE];
    await this.authService.logout(token);
    clearSessionCookie(res);
  }

  @Get('me')
  me(@CurrentUser() user: UserDocument): PublicUser {
    return toPublicUser(user);
  }

  // 需要輸入目前的密碼，同樣限流避免被拿來暴力猜密碼
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMIT)
  @Patch('password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: UserDocument,
    @CurrentSessionId() sessionId: Types.ObjectId,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordDto,
  ): Promise<void> {
    await this.usersService.changePassword(
      user,
      body.currentPassword,
      body.newPassword,
      sessionId,
    );
  }
}
