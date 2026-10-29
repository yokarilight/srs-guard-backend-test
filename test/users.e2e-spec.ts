import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { Session } from '../src/sessions/schemas/session.schema.js';
import { UsersService } from '../src/users/users.service.js';
import {
  type Agent,
  createTestApp,
  login,
  type TestContext,
} from './helpers.js';

describe('Users & account (e2e)', () => {
  let ctx: TestContext;
  let app: TestContext['app'];
  let admin: Agent;
  let adminId: string;
  let member: Agent;
  let memberId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;

    const users = app.get(UsersService);
    const adminUser = await users.create({
      email: 'admin@example.com',
      password: 'admin-pass',
      name: 'Admin',
      role: 'admin',
    });
    const memberUser = await users.create({
      email: 'member@example.com',
      password: 'member-pass',
      name: 'Member',
    });
    adminId = adminUser.id as string;
    memberId = memberUser.id as string;

    admin = await login(app, 'admin@example.com', 'admin-pass');
    member = await login(app, 'member@example.com', 'member-pass');
  });

  afterAll(() => ctx.close());

  describe('user management (F8-2)', () => {
    it('is limited to admins', async () => {
      await member.get('/api/users').expect(403);
      await member
        .post('/api/users')
        .send({ email: 'x@example.com', name: 'X', password: 'password1' })
        .expect(403);
      await member
        .patch(`/api/users/${adminId}`)
        .send({ disabled: true })
        .expect(403);
    });

    it('creates users and lists them without password hashes', async () => {
      const created = await admin
        .post('/api/users')
        .send({
          email: 'New@Example.com',
          name: '新同事',
          password: 'new-pass-1',
        })
        .expect(201);
      expect(created.body).toMatchObject({
        email: 'new@example.com',
        name: '新同事',
        role: 'user',
        disabled: false,
      });

      await admin
        .post('/api/users')
        .send({ email: 'new@example.com', name: 'Dup', password: 'new-pass-1' })
        .expect(409);
      await admin
        .post('/api/users')
        .send({ email: 'short@example.com', name: 'S', password: 'short' })
        .expect(400);

      const list = await admin.get('/api/users').expect(200);
      expect(list.body.map((u: any) => u.email)).toEqual([
        'admin@example.com',
        'member@example.com',
        'new@example.com',
      ]);
      expect(list.body[0]).not.toHaveProperty('passwordHash');

      await login(app, 'new@example.com', 'new-pass-1');
    });

    it('resets a password and signs the user out everywhere', async () => {
      const user = await login(app, 'member@example.com', 'member-pass');
      await admin
        .patch(`/api/users/${memberId}`)
        .send({ password: 'reset-pass-1' })
        .expect(200);

      await user.get('/api/auth/me').expect(401);
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'member@example.com', password: 'member-pass' })
        .expect(401);
      member = await login(app, 'member@example.com', 'reset-pass-1');
    });

    it('disables and re-enables an account', async () => {
      const disabled = await admin
        .patch(`/api/users/${memberId}`)
        .send({ disabled: true })
        .expect(200);
      expect(disabled.body.disabled).toBe(true);

      await member.get('/api/auth/me').expect(401);
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'member@example.com', password: 'reset-pass-1' })
        .expect(401);

      await admin
        .patch(`/api/users/${memberId}`)
        .send({ disabled: false })
        .expect(200);
      member = await login(app, 'member@example.com', 'reset-pass-1');
    });

    it('prevents admins from locking themselves out', async () => {
      await admin
        .patch(`/api/users/${adminId}`)
        .send({ disabled: true })
        .expect(400);
      await admin
        .patch(`/api/users/${adminId}`)
        .send({ role: 'user' })
        .expect(400);
      await admin.patch(`/api/users/${adminId}`).send({}).expect(400);
      await admin.get('/api/users').expect(200);
    });

    it('returns 404 for an unknown user', async () => {
      await admin
        .patch(`/api/users/${new Types.ObjectId().toString()}`)
        .send({ name: 'x' })
        .expect(404);
    });
  });

  describe('my role (F8-6)', () => {
    it('sets and clears the preferred role', async () => {
      const roleId = new Types.ObjectId().toString();
      const set = await member
        .patch('/api/me')
        .send({ preferredRoleId: roleId })
        .expect(200);
      expect(set.body.preferredRoleId).toBe(roleId);
      const me = await member.get('/api/auth/me').expect(200);
      expect(me.body.preferredRoleId).toBe(roleId);

      const cleared = await member
        .patch('/api/me')
        .send({ preferredRoleId: null })
        .expect(200);
      expect(cleared.body.preferredRoleId).toBeNull();

      await member
        .patch('/api/me')
        .send({ preferredRoleId: 'nope' })
        .expect(400);
    });
  });

  describe('password, logout and session timeout (F8-7)', () => {
    it('changes the password and keeps only the current session', async () => {
      const otherDevice = await login(
        app,
        'member@example.com',
        'reset-pass-1',
      );

      await member
        .patch('/api/auth/password')
        .send({ currentPassword: 'wrong-pass', newPassword: 'changed-pass-1' })
        .expect(400);
      await member
        .patch('/api/auth/password')
        .send({ currentPassword: 'reset-pass-1', newPassword: 'reset-pass-1' })
        .expect(400);
      await member
        .patch('/api/auth/password')
        .send({
          currentPassword: 'reset-pass-1',
          newPassword: 'changed-pass-1',
        })
        .expect(204);

      await member.get('/api/auth/me').expect(200);
      await otherDevice.get('/api/auth/me').expect(401);
      await login(app, 'member@example.com', 'changed-pass-1');
    });

    it('rejects expired sessions', async () => {
      const agent = await login(app, 'admin@example.com', 'admin-pass');
      await agent.get('/api/auth/me').expect(200);

      const sessionModel = app.get<Model<Session>>(getModelToken(Session.name));
      await sessionModel.updateMany(
        { userId: new Types.ObjectId(adminId) },
        { expiresAt: new Date(Date.now() - 1000) },
      );
      await agent.get('/api/auth/me').expect(401);
      admin = await login(app, 'admin@example.com', 'admin-pass');
    });

    it('rate-limits login attempts', async () => {
      process.env.AUTH_RATE_LIMIT_PER_MINUTE = '1';
      try {
        const attempt = () =>
          request(app.getHttpServer())
            .post('/api/auth/login')
            .send({ email: 'admin@example.com', password: 'wrong-pass' });
        await attempt();
        await attempt().expect(429);
      } finally {
        process.env.AUTH_RATE_LIMIT_PER_MINUTE = '1000';
      }
    });
  });
});
