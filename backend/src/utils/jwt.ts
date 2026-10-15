import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { durationInSeconds, getEnvironment } from '../config/environment';

const claims = z.object({ id: z.string().regex(/^[1-9]\d*$/), sid: z.uuid() });
export type TokenPayload = z.infer<typeof claims>;
const issuer = 'study-tracker';
const audience = 'study-tracker:web';

export const generateAccessToken = (payload: TokenPayload): string => jwt.sign(claims.parse(payload), getEnvironment().JWT_SECRET, {
  algorithm: 'HS256', issuer, audience, expiresIn: durationInSeconds(getEnvironment().JWT_EXPIRE),
});

export const verifyAccessToken = (token: string): TokenPayload => claims.parse(jwt.verify(token, getEnvironment().JWT_SECRET, {
  algorithms: ['HS256'], issuer, audience,
}));
