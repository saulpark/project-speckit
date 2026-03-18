import { UserResponse } from '../services/authService';

declare global {
  namespace Express {
    interface Request {
      user?: UserResponse;
      profileOperation?: string;
      tokenPayload?: any;
      isAdmin?: boolean;
    }
  }
}