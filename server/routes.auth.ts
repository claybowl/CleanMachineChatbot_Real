
import { Express, Request, Response } from 'express';
import { db } from './db';
import { users, passwordResetTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export function registerAuthRoutes(app: Express) {
  // Login endpoint with bcrypt password verification
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password required',
        });
      }

      // Find user
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!userResult || userResult.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const user = userResult[0];

      // Verify password with bcrypt
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({
            success: false,
            message: 'Login failed',
          });
        }

        // Store user ID in session (cookie-based, HttpOnly)
        req.session.userId = user.id;

        // Save session before sending response
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.status(500).json({
              success: false,
              message: 'Login failed',
            });
          }

          res.json({
            success: true,
            user: {
              id: user.id,
              username: user.username,
            },
          });
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
      });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to logout',
        });
      }
      res.clearCookie('sessionId');
      res.json({ success: true });
    });
  });

  // Verify session endpoint
  app.get('/api/auth/verify', (req: Request, res: Response) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'No session' 
      });
    }

    res.json({ 
      success: true,
      userId: req.session.userId 
    });
  });

  // Register new user endpoint
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { username, password, email } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password required',
        });
      }

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser && existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const newUser = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email: email || null,
        })
        .returning();

      res.json({
        success: true,
        user: {
          id: newUser[0].id,
          username: newUser[0].username,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
      });
    }
  });

  // Request password reset
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email required',
        });
      }

      // Find user by email
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // Always return success even if email not found (security best practice)
      if (!userResult || userResult.length === 0) {
        return res.json({
          success: true,
          message: 'If email exists, a reset link has been sent',
        });
      }

      const user = userResult[0];

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token in database
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token: resetToken,
        expiresAt,
      });

      // TODO: Send email with reset link using SendGrid
      // For now, log the reset link
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      console.log('Password reset link:', resetLink);

      res.json({
        success: true,
        message: 'If email exists, a reset link has been sent',
        // For development only - remove in production
        resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined,
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process request',
      });
    }
  });

  // Change password for authenticated users
  app.post('/api/auth/change-password', async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password required',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters',
        });
      }

      // Get user from database
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId))
        .limit(1);

      if (!userResult || userResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const user = userResult[0];

      // Verify current password
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update user password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
      });
    }
  });

  // Reset password with token
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password required',
        });
      }

      // Find valid token
      const tokenResult = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token))
        .limit(1);

      if (!tokenResult || tokenResult.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
        });
      }

      const resetToken = tokenResult[0];

      // Check if token is expired or already used
      if (resetToken.used || new Date(resetToken.expiresAt) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update user password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, resetToken.userId));

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, resetToken.id));

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
      });
    }
  });
}
