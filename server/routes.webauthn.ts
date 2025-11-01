import { Express, Request, Response } from 'express';
import { db } from './db';
import { webauthnCredentials, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

// WebAuthn configuration
const rpName = 'Clean Machine Auto Detail';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5000';

export function registerWebAuthnRoutes(app: Express) {
  // Generate registration options for enrolling a new biometric credential
  app.post('/api/webauthn/register/options', async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'Must be logged in to register biometric',
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

      // Get existing credentials for this user
      const existingCredentials = await db
        .select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.userId, user.id));

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: user.id.toString(),
        userName: user.username,
        attestationType: 'none',
        excludeCredentials: existingCredentials.map((cred) => ({
          id: Buffer.from(cred.credentialId, 'base64'),
          type: 'public-key',
          transports: cred.transports as AuthenticatorTransportFuture[],
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform',
        },
      });

      // Store challenge in session for verification
      req.session.webauthnChallenge = options.challenge;

      res.json({ success: true, options });
    } catch (error) {
      console.error('WebAuthn registration options error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate registration options',
      });
    }
  });

  // Verify registration response and store credential
  app.post('/api/webauthn/register/verify', async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId || !req.session.webauthnChallenge) {
        return res.status(401).json({
          success: false,
          message: 'Invalid session',
        });
      }

      const { response, deviceName } = req.body as { 
        response: RegistrationResponseJSON;
        deviceName: string;
      };

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: req.session.webauthnChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({
          success: false,
          message: 'Verification failed',
        });
      }

      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      // Store credential in database
      await db.insert(webauthnCredentials).values({
        userId: req.session.userId,
        credentialId: Buffer.from(credentialID).toString('base64'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        transports: response.response.transports || [],
        deviceName: deviceName || 'Biometric Device',
      });

      // Clear challenge from session
      delete req.session.webauthnChallenge;

      res.json({
        success: true,
        message: 'Biometric credential registered successfully',
      });
    } catch (error) {
      console.error('WebAuthn registration verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify registration',
      });
    }
  });

  // Generate authentication options for biometric login
  app.post('/api/webauthn/authenticate/options', async (req: Request, res: Response) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username required',
        });
      }

      // Find user
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!userResult || userResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const user = userResult[0];

      // Get user's credentials
      const credentials = await db
        .select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.userId, user.id));

      if (credentials.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No biometric credentials found',
        });
      }

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: credentials.map((cred) => ({
          id: Buffer.from(cred.credentialId, 'base64'),
          type: 'public-key',
          transports: cred.transports as AuthenticatorTransportFuture[],
        })),
        userVerification: 'preferred',
      });

      // Store challenge and user ID in session for verification
      req.session.webauthnChallenge = options.challenge;
      req.session.webauthnUserId = user.id;

      res.json({ success: true, options });
    } catch (error) {
      console.error('WebAuthn authentication options error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate authentication options',
      });
    }
  });

  // Verify authentication response and log in user
  app.post('/api/webauthn/authenticate/verify', async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.webauthnChallenge || !req.session.webauthnUserId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid session',
        });
      }

      const { response } = req.body as { response: AuthenticationResponseJSON };

      // Get credential from database
      const credentialResult = await db
        .select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.credentialId, response.id))
        .limit(1);

      if (!credentialResult || credentialResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Credential not found',
        });
      }

      const credential = credentialResult[0];

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: req.session.webauthnChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialID: Buffer.from(credential.credentialId, 'base64'),
          credentialPublicKey: Buffer.from(credential.publicKey, 'base64'),
          counter: credential.counter,
        },
      });

      if (!verification.verified) {
        return res.status(400).json({
          success: false,
          message: 'Verification failed',
        });
      }

      // Update counter
      await db
        .update(webauthnCredentials)
        .set({ counter: verification.authenticationInfo.newCounter })
        .where(eq(webauthnCredentials.id, credential.id));

      // Get user
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, credential.userId))
        .limit(1);

      if (!userResult || userResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const user = userResult[0];

      // Clear WebAuthn session data
      const webauthnUserId = req.session.webauthnUserId;
      delete req.session.webauthnChallenge;
      delete req.session.webauthnUserId;

      // Regenerate session and log in user
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({
            success: false,
            message: 'Login failed',
          });
        }

        req.session.userId = user.id;

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
      console.error('WebAuthn authentication verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify authentication',
      });
    }
  });

  // Get user's registered biometric devices
  app.get('/api/webauthn/credentials', async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const credentials = await db
        .select({
          id: webauthnCredentials.id,
          deviceName: webauthnCredentials.deviceName,
          createdAt: webauthnCredentials.createdAt,
        })
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.userId, req.session.userId));

      res.json({
        success: true,
        credentials,
      });
    } catch (error) {
      console.error('Get credentials error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get credentials',
      });
    }
  });

  // Delete a biometric credential
  app.delete('/api/webauthn/credentials/:id', async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const credentialId = parseInt(req.params.id);

      // Verify credential belongs to user
      const credentialResult = await db
        .select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.id, credentialId))
        .limit(1);

      if (!credentialResult || credentialResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Credential not found',
        });
      }

      if (credentialResult[0].userId !== req.session.userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      await db
        .delete(webauthnCredentials)
        .where(eq(webauthnCredentials.id, credentialId));

      res.json({
        success: true,
        message: 'Credential deleted',
      });
    } catch (error) {
      console.error('Delete credential error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete credential',
      });
    }
  });
}

// Type augmentation for session
declare module 'express-session' {
  interface SessionData {
    webauthnChallenge?: string;
    webauthnUserId?: number;
  }
}
