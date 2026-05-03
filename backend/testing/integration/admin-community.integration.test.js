const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let User;
let Post;
let Report;
let mongod;

const sign = (id) => jwt.sign({ id: String(id) }, process.env.JWT_SECRET || 'dev-secret-change-me', { expiresIn: '1d' });

describe('Admin + Community integration', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    app = require('../../src/app');
    User = require('../../src/models/User');
    Post = require('../../src/models/Post');
    Report = require('../../src/models/Report');
  });

  afterEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({}),
      Report.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongod) await mongod.stop();
  });

  test('creates report and returns it in admin reports list', async () => {
    const admin = await User.create({ name: 'Admin', email: 'admin@t.com', password: 'pass1234', role: 'admin' });
    const author = await User.create({ name: 'Author', email: 'author@t.com', password: 'pass1234', role: 'participant' });
    const reporter = await User.create({ name: 'Reporter', email: 'reporter@t.com', password: 'pass1234', role: 'participant' });

    const post = await Post.create({ title: 'Hello', content: 'World', author: author._id, tags: [] });

    const reportRes = await request(app)
      .post(`/api/posts/${post._id}/report`)
      .set('Authorization', `Bearer ${sign(reporter._id)}`)
      .send({ reason: 'spam' });

    expect(reportRes.status).toBe(201);
    expect(reportRes.body.success).toBe(true);

    const adminList = await request(app)
      .get('/api/admin/reports?status=pending')
      .set('Authorization', `Bearer ${sign(admin._id)}`);

    expect(adminList.status).toBe(200);
    expect(adminList.body.success).toBe(true);
    expect(Array.isArray(adminList.body.reports)).toBe(true);
    expect(adminList.body.reports.length).toBeGreaterThan(0);
  });

  test('prevents duplicate report by same user (error scenario)', async () => {
    const author = await User.create({ name: 'Author', email: 'a2@t.com', password: 'pass1234', role: 'participant' });
    const reporter = await User.create({ name: 'Reporter', email: 'r2@t.com', password: 'pass1234', role: 'participant' });

    const post = await Post.create({ title: 'Title', content: 'Body', author: author._id, tags: [] });

    await request(app)
      .post(`/api/posts/${post._id}/report`)
      .set('Authorization', `Bearer ${sign(reporter._id)}`)
      .send({ reason: 'spam' });

    const duplicate = await request(app)
      .post(`/api/posts/${post._id}/report`)
      .set('Authorization', `Bearer ${sign(reporter._id)}`)
      .send({ reason: 'spam' });

    expect(duplicate.status).toBe(400);
    expect(String(duplicate.body.message || '')).toContain('already reported');
  });

  test('rejects invalid report payload for reason=other without details (validation scenario)', async () => {
    const author = await User.create({ name: 'Author', email: 'a3@t.com', password: 'pass1234', role: 'participant' });
    const reporter = await User.create({ name: 'Reporter', email: 'r3@t.com', password: 'pass1234', role: 'participant' });
    const post = await Post.create({ title: 'Title', content: 'Body', author: author._id, tags: [] });

    const res = await request(app)
      .post(`/api/posts/${post._id}/report`)
      .set('Authorization', `Bearer ${sign(reporter._id)}`)
      .send({ reason: 'other', customReason: '' });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});
