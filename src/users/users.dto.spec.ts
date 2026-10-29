import {
  changePasswordSchema,
  passwordSchema,
  updateUserSchema,
} from './users.dto.js';

describe('user DTOs', () => {
  it('enforces the bcrypt 72-byte limit on multi-byte passwords', () => {
    // 中文每字 3 bytes：24 字剛好 72 bytes
    expect(passwordSchema.safeParse('密'.repeat(24)).success).toBe(true);
    expect(passwordSchema.safeParse('密'.repeat(25)).success).toBe(false);
  });

  it('requires at least one field when an admin edits a user', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
    expect(updateUserSchema.safeParse({ disabled: false }).success).toBe(true);
  });

  it('rejects reusing the current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'same-pass-1',
      newPassword: 'same-pass-1',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['newPassword']);
  });
});
