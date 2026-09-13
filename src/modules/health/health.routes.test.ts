import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';

describe('GET /health', () => {
  it('returns ok status', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
    expect(typeof response.body.timestamp).toBe('string');
  });
});
