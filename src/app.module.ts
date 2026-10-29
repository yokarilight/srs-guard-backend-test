import { INestApplication, Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import cookieParser from 'cookie-parser';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { TopicsModule } from './topics/topics.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'srs-guard-backend-test',
    }),
    DatabaseModule,
    AuthModule,
    TopicsModule,
  ],
})
export class AppModule {}

// main.ts 與 e2e 測試共用，確保兩邊的 app 設定一致
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
}
