import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface FcmMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private app: admin.app.App;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length > 0) return; // already initialized

    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: this.config.get<string>('FIREBASE_PROJECT_ID'),
        clientEmail: this.config.get<string>('FIREBASE_CLIENT_EMAIL'),
        privateKey: this.config
          .get<string>('FIREBASE_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n'),
      }),
    });

    this.logger.log('Firebase Admin SDK initialized.');
  }

  /**
   * Send to a single FCM token.
   */
  async send(token: string, message: FcmMessage): Promise<void> {
    try {
      await admin.messaging().send({
        token,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.imageUrl,
        },
        data: message.data
          ? Object.fromEntries(
              Object.entries(message.data).map(([k, v]) => [k, String(v)]),
            )
          : undefined,
        android: {
          priority: 'high',
          notification: { sound: 'sos_alert', channelId: 'cerp_sos' },
        },
        apns: {
          payload: {
            aps: {
              sound: 'sos_alert.caf',
              contentAvailable: true,
              badge: 1,
            },
          },
        },
      });
    } catch (err) {
      this.logger.error(`FCM send failed for token ${token.slice(0, 20)}...`, err);
    }
  }

  /**
   * Send to multiple tokens in batches of 500 (FCM limit).
   * Invalid tokens are automatically removed from the result.
   */
  async sendBatch(tokens: string[], message: FcmMessage): Promise<void> {
    if (tokens.length === 0) return;

    const BATCH_SIZE = 500;
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      const multicastMessage: admin.messaging.MulticastMessage = {
        tokens: batch,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.imageUrl,
        },
        data: message.data,
        android: {
          priority: 'high',
          notification: { sound: 'sos_alert', channelId: 'cerp_sos' },
        },
        apns: {
          payload: { aps: { sound: 'sos_alert.caf', badge: 1 } },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(multicastMessage);
      const failed = response.failureCount;
      if (failed > 0) {
        this.logger.warn(
          `FCM batch: ${response.successCount} sent, ${failed} failed`,
        );
      }
    }
  }
}
