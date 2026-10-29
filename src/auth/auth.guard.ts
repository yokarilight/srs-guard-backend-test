import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { SESSION_COOKIE } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import { AuthenticatedRequest, IS_PUBLIC_KEY } from './decorators.js';
import { setSessionCookie } from './session-cookie.js';

// 全域套用：除了標記 @Public() 的路由，所有 API 都需要登入
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const http = context.switchToHttp();
    const req = http.getRequest<AuthenticatedRequest>();
    const token = (req.cookies as Record<string, string> | undefined)?.[
      SESSION_COOKIE
    ];
    if (!token) throw new UnauthorizedException('請先登入');

    const result = await this.authService.authenticate(token);
    if (!result) throw new UnauthorizedException('登入已逾時，請重新登入');

    if (result.renewed) {
      setSessionCookie(
        http.getResponse<Response>(),
        token,
        result.session.expiresAt,
      );
    }
    req.user = result.user;
    req.sessionId = result.session._id;
    return true;
  }
}
