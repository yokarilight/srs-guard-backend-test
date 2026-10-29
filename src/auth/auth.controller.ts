import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { type PublicUser, toPublicUser } from '../users/users.service.js';
import { SESSION_COOKIE } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public } from './decorators.js';
import { clearSessionCookie, setSessionCookie } from './session-cookie.js';

const loginSchema = z.object({
  email: z.email('Email 格式錯誤'),
  password: z.string().min(1, '請輸入密碼'),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
}
