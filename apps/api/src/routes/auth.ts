/**
 * Authentication API Routes
 * 
 * Provides endpoints for:
 * - User registration and profile management
 * - JWT token generation and validation
 * - User preferences and settings
 * - Multi-user support
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/database';
import { authenticateToken, generateTestToken } from '../middleware/auth';

const router = Router();
const db = new DatabaseService();

// Initialize database connection
db.init().catch(console.error);

/**
 * POST /api/v1/auth/register - Complete user registration after OAuth
 * Body: { email, googleId, name?, avatarUrl? }
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, googleId, name, avatarUrl } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, googleId'
      });
    }

    // Check if user already exists (by googleId or email)
    let existingUser = await db.prisma.client.user.findUnique({
      where: { googleId }
    });

    // If not found by googleId, check by email
    if (!existingUser) {
      existingUser = await db.prisma.client.user.findUnique({
        where: { email }
      });
    }

    if (existingUser) {
      // Update googleId if user was found by email but has different/missing googleId
      if (existingUser.googleId !== googleId) {
        existingUser = await db.prisma.client.user.update({
          where: { id: existingUser.id },
          data: { googleId }
        });
      }

      // Generate JWT token for existing user
      const token = jwt.sign(
        { userId: existingUser.id, email: existingUser.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        data: {
          user: existingUser,
          token,
          expiresIn: '24h'
        },
        message: 'User login successful'
      });
    }

    // Create new user
    const user = await db.prisma.createUser({
      email,
      googleId,
      name,
      avatarUrl
    });

    // Generate JWT token for new user
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
        expiresIn: '24h'
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/auth/login - Generate JWT token for existing user
 * Body: { email, googleId }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, googleId } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, googleId'
      });
    }

    const user = await db.prisma.client.user.findUnique({
      where: { googleId },
      include: {
        _count: {
          select: {
            userJobs: true,
            customJobStages: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Please register first.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        user,
        token,
        expiresIn: '24h'
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/auth/me - Get current user profile (requires authentication)
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const user = await db.prisma.client.user.findUnique({
      where: { id: userId },
      include: {
        customJobStages: {
          orderBy: { sortOrder: 'asc' }
        },
        userJobs: {
          include: {
            job: {
              select: {
                id: true,
                title: true,
                company: true,
                location: true,
                relevanceScore: true,
                createdAt: true
              }
            },
            stage: {
              select: {
                id: true,
                name: true,
                color: true,
                isSystem: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 10 // Recent jobs
        },
        _count: {
          select: {
            userJobs: true,
            customJobStages: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/v1/auth/profile - Update user profile (requires authentication)
 * Body: { name?, avatarUrl?, settings? }
 */
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { name, avatarUrl, settings } = req.body;

    const user = await db.prisma.client.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(avatarUrl && { avatarUrl }),
        ...(settings && { settings }),
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/auth/users/:email - Find user by email (for OAuth flow)
 */
router.get('/users/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email;
    
    const user = await db.prisma.client.user.findUnique({
      where: { email },
      include: {
        _count: {
          select: {
            userJobs: true,
            customJobStages: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error finding user by email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/auth/dev-token - Generate development token (dev only)
 * Body: { userId, email }
 */
router.post('/dev-token', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ 
      success: false, 
      error: 'Not available in production' 
    });
  }

  const { userId, email } = req.body;

  if (!userId || !email) {
    return res.status(400).json({
      success: false,
      error: 'Missing userId or email'
    });
  }

  const token = generateTestToken(parseInt(userId), email);
  res.json({
    success: true,
    data: { 
      token,
      userId: parseInt(userId),
      email,
      expiresIn: '24h'
    },
    message: 'Development token generated'
  });
});

/**
 * POST /api/v1/auth/validate - Validate JWT token
 */
router.post('/validate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    res.json({
      success: true,
      data: {
        userId,
        email,
        valid: true
      },
      message: 'Token is valid'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

export default router;