import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaMembership } from '../areas/entities/area-membership.entity';

@WebSocketGateway({
  cors: {
    origin: process.env.APP_URL ?? 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/ws',
})
export class IncidentsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(IncidentsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(AreaMembership)
    private readonly memberRepo: Repository<AreaMembership>,
  ) {}

  afterInit() {
    this.logger.log('WebSocket gateway initialized at /ws');
  }

  // ── Connection ────────────────────────────────────────────────────────────────
  async handleConnection(socket: Socket) {
    try {
      const token =
        socket.handshake.auth?.token ??
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        socket.emit('error', { message: 'Authentication required.' });
        socket.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });

      const userId: string = payload.sub;

      // Load user's active area memberships and join their rooms
      const memberships = await this.memberRepo.find({
        where: { userId, isActive: true },
      });

      for (const m of memberships) {
        await socket.join(`area:${m.areaId}`);
      }

      socket.data.userId = userId;
      socket.data.areaIds = memberships.map((m) => m.areaId);

      this.logger.log(`Client connected: ${userId} (${memberships.length} areas)`);
    } catch {
      socket.emit('error', { message: 'Invalid authentication token.' });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Client disconnected: ${socket.data?.userId}`);
  }

  // ── Client can join an area room after joining an area mid-session ──────────
  @SubscribeMessage('join_area')
  async handleJoinArea(
    @MessageBody() data: { areaId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const userId: string = socket.data.userId;
    const membership = await this.memberRepo.findOne({
      where: { userId, areaId: data.areaId, isActive: true },
    });
    if (!membership) {
      socket.emit('error', { message: 'Not a member of this Area.' });
      return;
    }
    await socket.join(`area:${data.areaId}`);
    socket.emit('joined_area', { areaId: data.areaId });
  }

  @SubscribeMessage('leave_area')
  async handleLeaveArea(
    @MessageBody() data: { areaId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    await socket.leave(`area:${data.areaId}`);
    socket.emit('left_area', { areaId: data.areaId });
  }

  // ── Live Location Sharing ─────────────────────────────────────────────────
  /**
   * Victim emits their GPS every N seconds while SOS is active.
   * Gateway relays it to everyone in the area room so responders see live position.
   */
  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @MessageBody() data: { incidentId: string; areaId: string; lat: number; lng: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const userId: string = socket.data.userId;
    const { incidentId, areaId, lat, lng } = data;

    // Verify the sender is an active area member
    const membership = await this.memberRepo.findOne({
      where: { userId, areaId, isActive: true },
    });
    if (!membership) return;

    // Broadcast to all other members in the area
    this.server.to(`area:${areaId}`).emit('location:update', {
      incidentId,
      userId,
      lat,
      lng,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Victim stops sharing location (incident resolved or navigated away).
   */
  @SubscribeMessage('location:stop')
  handleLocationStop(
    @MessageBody() data: { incidentId: string; areaId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const { incidentId, areaId } = data;
    this.server.to(`area:${areaId}`).emit('location:stop', { incidentId });
    this.logger.log(`Location sharing stopped for incident ${incidentId}`);
  }

  // ── Server-to-client emitters ─────────────────────────────────────────────
  emitToArea(areaId: string, event: string, payload: unknown): void {
    this.server.to(`area:${areaId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
