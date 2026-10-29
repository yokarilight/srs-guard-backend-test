import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { Revision } from '../src/revisions/schemas/revision.schema.js';
import { UsersService } from '../src/users/users.service.js';
import {
  type Agent,
  createTestApp,
  login,
  type TestContext,
} from './helpers.js';

describe('Topics (e2e)', () => {
  let ctx: TestContext;
  let app: TestContext['app'];
  let alice: Agent;
  let bob: Agent;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;

    const users = app.get(UsersService);
    await users.create({
      email: 'alice@example.com',
      password: 'alice-pass',
      name: 'Alice',
    });
    await users.create({
      email: 'bob@example.com',
      password: 'bob-pass',
      name: 'Bob',
    });

    alice = await login(app, 'alice@example.com', 'alice-pass');
    bob = await login(app, 'bob@example.com', 'bob-pass');
  });

  afterAll(() => ctx.close());

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/api/topics').expect(401);
  });

  it('rejects a wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'nope' })
      .expect(401);
  });

  it('returns the logged-in user', async () => {
    const res = await alice.get('/api/auth/me').expect(200);
    expect(res.body).toMatchObject({
      email: 'alice@example.com',
      name: 'Alice',
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('validates topic input (F1-1)', async () => {
    const res = await alice
      .post('/api/topics')
      .send({ name: '   ' })
      .expect(400);
    expect(res.body.errors[0].path).toBe('name');
    await alice.post('/api/topics').send({}).expect(400);
  });

  it('creates, lists, edits and deletes topics (F1-1 ~ F1-4)', async () => {
    const created = await alice
      .post('/api/topics')
      .send({ name: '  會員系統  ', description: '登入與註冊' })
      .expect(201);
    expect(created.body).toMatchObject({
      name: '會員系統',
      description: '登入與註冊',
      owner: { name: 'Alice' },
      currentRevision: null,
      isOwner: true,
      revisions: [],
    });
    const topicId = created.body.id as string;

    await bob.post('/api/topics').send({ name: 'Bob 的主題' }).expect(201);

    // F1-2：全部主題 vs 我的主題
    const all = await bob.get('/api/topics').expect(200);
    expect(all.body.map((t: any) => t.name)).toEqual([
      'Bob 的主題',
      '會員系統',
    ]);
    const mine = await bob.get('/api/topics?scope=mine').expect(200);
    expect(mine.body.map((t: any) => t.name)).toEqual(['Bob 的主題']);
    await bob.get('/api/topics?scope=other').expect(400);

    // F1-3：其他人可唯讀檢視
    const viewed = await bob.get(`/api/topics/${topicId}`).expect(200);
    expect(viewed.body).toMatchObject({ name: '會員系統', isOwner: false });

    // F1-4：只有建立者能編輯與刪除
    await bob.patch(`/api/topics/${topicId}`).send({ name: 'x' }).expect(403);
    await bob.delete(`/api/topics/${topicId}`).expect(403);
    await alice.patch(`/api/topics/${topicId}`).send({}).expect(400);
    const updated = await alice
      .patch(`/api/topics/${topicId}`)
      .send({ name: '會員系統 v2' })
      .expect(200);
    expect(updated.body).toMatchObject({
      name: '會員系統 v2',
      description: '登入與註冊',
    });

    await alice.delete(`/api/topics/${topicId}`).expect(204);
    await alice.get(`/api/topics/${topicId}`).expect(404);
  });

  it('shows the current revision status and cascades delete to revisions', async () => {
    const created = await alice
      .post('/api/topics')
      .send({ name: '有版本的主題' })
      .expect(201);
    const topicId = new Types.ObjectId(created.body.id as string);

    // F2 尚未實作，直接寫入版本模擬上傳 SRS 後的狀態
    const revisionModel = app.get<Model<Revision>>(
      getModelToken(Revision.name),
    );
    await revisionModel.create({ topicId, version: 1, status: 'completed' });
    const v2 = await revisionModel.create({
      topicId,
      version: 2,
      status: 'clarifying',
    });
    const topicModel = app.get<Model<any>>(getModelToken('Topic'));
    await topicModel.updateOne({ _id: topicId }, { currentRevisionId: v2._id });

    const list = await bob.get('/api/topics').expect(200);
    const item = list.body.find((t: any) => t.id === created.body.id);
    expect(item.currentRevision).toMatchObject({
      version: 2,
      status: 'clarifying',
    });

    const detail = await bob.get(`/api/topics/${created.body.id}`).expect(200);
    expect(detail.body.revisions.map((r: any) => r.version)).toEqual([2, 1]);

    await alice.delete(`/api/topics/${created.body.id}`).expect(204);
    expect(await revisionModel.countDocuments({ topicId })).toBe(0);
  });

  it('returns 404 for malformed or unknown ids', async () => {
    await alice.get('/api/topics/not-an-id').expect(404);
    await alice
      .get(`/api/topics/${new Types.ObjectId().toString()}`)
      .expect(404);
  });

  it('logs out and invalidates the session', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'bob-pass' })
      .expect(200);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/topics').expect(401);
  });
});
