import 'express-session';

declare module 'express-session' {
  interface Session {
    userId?: number;
    loginUserId?: number;
    loginChallenge?: string;
  }
}