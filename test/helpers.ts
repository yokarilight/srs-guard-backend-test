import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule, configureApp } from '../src/app.module.js';

export type Agent = ReturnType<typeof request.agent>;

export interface TestContext {
  app: INestApplication<App>;
  close: () => Promise<void>;
}

// 每個測試檔各自一個記憶體 MongoDB 與 app，互不影響
export async function createTestApp(): Promise<TestContext> {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('srs-guard-test');
  // 測試會登入很多次，放寬限流；需要時個別測試再調低
  process.env.AUTH_RATE_LIMIT_PER_MINUTE = '1000';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  return {
    app,
    close: async () => {
      await app.close();
      await mongo.stop();
    },
  };
}

export async function login(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<Agent> {
  const agent = request.agent(app.getHttpServer());
  await agent.post('/api/auth/login').send({ email, password }).expect(200);
  return agent;
}
