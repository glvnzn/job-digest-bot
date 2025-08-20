/**
 * Authentication Middleware
 * 
 * Provides JWT token validation and user session management
 * Can be enabled/disabled via environment variable for development
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/database';

const db = new DatabaseService();

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
        isAdmin?: boolean;
      };
    }
  }
}

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and attaches user to request
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication in development if disabled
  if (process.env.DISABLE_AUTH === 'true') {
    console.log('⚠️ Authentication disabled for development');
    // Attach a default user for development
    req.user = {
      id: '1',
      email: 'dev@example.com',
      name: 'Development User',
      isAdmin: true
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      message: 'Please provide a valid authorization token'
    });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Fetch user from database to ensure they still exist
    // Ensure userId is a string (prevents JS number precision issues)
    const userId = String(decoded.userId);
    const user = await db.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        settings: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    // Attach user to request with updated structure
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      isAdmin: user.email === process.env.ADMIN_EMAIL // Simple admin check
    };

    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
      message: 'Please log in again'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Allows both authenticated and anonymous access
 * Attaches user if token is provided and valid
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // No token, continue without user
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Ensure userId is a string (prevents JS number precision issues)
    const userId = String(decoded.userId);
    const user = await db.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name
      };
    }
  } catch (error) {
    // Invalid token, but continue without user
    console.log('Optional auth failed, continuing without user');
  }

  next();
};

/**
 * Admin Only Middleware
 * Requires authentication and admin privileges
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required'
    });
  }

  next();
};

/**
 * User Ownership Middleware
 * Ensures user can only access their own data
 */
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const requestedUserId = req.params[userIdParam];
    
    // Admin can access any user's data
    if (req.user.isAdmin) {
      return next();
    }

    // Users can only access their own data
    if (req.user.id !== requestedUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access your own data'
      });
    }

    next();
  };
};

/**
 * Development Helper: Generate JWT for testing
 */
export const generateTestToken = (userId: string, email: string): string => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret-key';
  return jwt.sign(
    { 
      userId, 
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }, 
    JWT_SECRET
  );
};