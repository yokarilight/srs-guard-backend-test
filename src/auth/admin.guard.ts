import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './decorators.js';

// 搭配全域 AuthGuard 使用，那時 req.user 已經就緒
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('只有管理者可以執行此操作');
    }
    return true;
  }
}
