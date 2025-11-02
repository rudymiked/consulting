/// <reference types="jest" />
import request from 'supertest';
import app from '../src/index';
import { expect, describe, it } from '@jest/globals';

describe('GET /api (health)', () => {
	it('returns 200 and a running message', async () => {
		const res = await request(app).get('/api');
		expect(res.status).toBe(200);
		expect(res.text).toContain('API is running');
	});
});
