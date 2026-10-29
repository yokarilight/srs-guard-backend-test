import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Types } from 'mongoose';
import type { UserDocument } from '../users/schemas/user.schema.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export interface AuthenticatedRequest extends Request {
  user: UserDocument;
  sessionId: Types.ObjectId;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserDocument =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

export const CurrentSessionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Types.ObjectId =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().sessionId,
);
