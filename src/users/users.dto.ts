import { Types } from 'mongoose';
import { z } from 'zod';
import { USER_ROLES } from './schemas/user.schema.js';

export const PASSWORD_MIN = 8;
// bcrypt 只看前 72 bytes，超過的部分會被忽略
export const PASSWORD_MAX_BYTES = 72;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `密碼至少需要 ${PASSWORD_MIN} 個字元`)
  .refine((v) => Buffer.byteLength(v) <= PASSWORD_MAX_BYTES, {
    message: '密碼過長',
  });

const name = z
  .string()
  .trim()
  .min(1, '請輸入姓名')
  .max(50, '姓名不可超過 50 字');

export const createUserSchema = z.object({
  email: z.email('Email 格式錯誤'),
  name,
  password: passwordSchema,
  role: z.enum(USER_ROLES).default('user'),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

// 管理者編輯使用者：停用 / 啟用、重設密碼、改名或改權限
export const updateUserSchema = z
  .object({
    name: name.optional(),
    role: z.enum(USER_ROLES).optional(),
    disabled: z.boolean().optional(),
    password: passwordSchema.optional(),
  })
  .refine((v) => Object.values(v).some((field) => field !== undefined), {
    message: '至少需要修改一個欄位',
  });
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export const updateMeSchema = z.object({
  // null 代表清除「我的角色」
  preferredRoleId: z
    .string()
    .refine((v) => Types.ObjectId.isValid(v), { message: '角色 id 格式錯誤' })
    .nullable(),
});
export type UpdateMeDto = z.infer<typeof updateMeSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '請輸入目前的密碼'),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: '新密碼不可與目前的密碼相同',
    path: ['newPassword'],
  });
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
