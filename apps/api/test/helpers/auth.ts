import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from './http.js';

export type TestAgent = ReturnType<typeof request.agent>;

interface CreateAuthenticatedAgentOptions {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

export async function createAuthenticatedAgent(
  app: INestApplication,
  {
    email,
    password = 'Password123!',
    firstName = 'Test',
    lastName = 'User',
  }: CreateAuthenticatedAgentOptions,
): Promise<TestAgent> {
  const agent = request.agent(app.getHttpServer());

  await agent
    .post('/auth/register')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      email,
      password,
      firstName,
      lastName,
    })
    .expect(201);

  await agent
    .post('/auth/login')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      email,
      password,
    })
    .expect(200);

  return agent;
}
