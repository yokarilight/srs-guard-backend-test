// 建立第一位管理者（F8-2）。部署後執行一次：
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... pnpm run create-admin
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module.js';
import { UsersModule } from '../users/users.module.js';
import { UsersService } from '../users/users.service.js';

@Module({ imports: [DatabaseModule, UsersModule] })
class CreateAdminModule {}

const MIN_PASSWORD_LENGTH = 8;

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Admin';
  if (!email || !password) {
    throw new Error('請設定 ADMIN_EMAIL 與 ADMIN_PASSWORD 環境變數');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`密碼至少需要 ${MIN_PASSWORD_LENGTH} 個字元`);
  }

  const app = await NestFactory.createApplicationContext(CreateAdminModule, {
    logger: ['error'],
  });
  try {
    const user = await app
      .get(UsersService)
      .create({ email, password, name, role: 'admin' });
    console.log(`已建立管理者 ${user.email}`);
  } finally {
    await app.close();
  }
}

await main();
