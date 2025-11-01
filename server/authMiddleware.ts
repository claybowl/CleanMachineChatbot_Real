
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Middleware to check if user is authenticated
 * Uses express-session with HttpOnly cookies
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if session exists and has userId
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Get user from database
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      // User no longer exists, destroy session
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: 'Invalid session',
      });
    }

    // Attach user to request for use in routes
    (req as any).user = userResult[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
}
