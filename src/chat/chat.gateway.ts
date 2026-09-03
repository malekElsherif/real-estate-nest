import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { SendMessageDto } from '../messages/dto/send-message.dto';
import { MessagesService } from '../messages/messages.service';

type AuthenticatedSocket = Socket & {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
};

@WebSocketGateway({
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly connectedUsers = new Map<number, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,
  ) {}

  afterInit() {
    console.log('ChatGateway initialized');
  }

  // =========================
  // SOCKET CONNECTION
  // =========================
  async handleConnection(client: AuthenticatedSocket) {
    console.log('a user connected', client.id);

    try {
      // Get JWT token
      const token = this.extractToken(client);

      // Verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: 'my-secret-key',
      });

      const userId = Number(payload.sub);

      // Save authenticated user inside socket
      client.user = {
        userId,
        email: payload.email,
        role: payload.role,
      };

      // Save userId -> socketId
      this.connectedUsers.set(userId, client.id);

      console.log('user connected:', {
        userId,
        socketId: client.id,
        connectedUsers: Array.from(this.connectedUsers.entries()),
      });

      // Tell client authentication succeeded
      client.emit('authSuccess', {
        userId,
        socketId: client.id,
      });
    } catch (error) {
      console.log('socket authentication failed');

      client.emit('authError', {
        message:
          error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }

  // =========================
  // SOCKET DISCONNECT
  // =========================
  handleDisconnect(client: AuthenticatedSocket) {
    console.log('user disconnected', client.id);

    if (client.user) {
      this.connectedUsers.delete(client.user.userId);

      console.log(
        'connected users:',
        Array.from(this.connectedUsers.entries()),
      );
    }
  }

  // =========================
  // OLD EVENT
  // message
  // =========================
  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket()
    client: AuthenticatedSocket,

    @MessageBody()
    data: string | SendMessageDto | { data?: SendMessageDto },
  ) {
    try {
      // Check if this is a chat message
      const messageDto = this.tryNormalizeMessageBody(data);

      // If not a chat message,
      // keep the old behavior
      if (!messageDto) {
        this.server.emit('message', data);

        return data;
      }

      // Check authentication
      if (!client.user) {
        throw new Error('Socket is not authenticated');
      }

      // Normalize receiverId
      const payload = {
        ...messageDto,
        receiverId: Number(messageDto.receiverId),
      };

      // Save message in database
      const message = await this.messagesService.sendMessage(
        client.user.userId,
        payload,
      );

      // Get receiver socket
      const receiverSocketId = this.connectedUsers.get(payload.receiverId);

      console.log('message event saved:', {
        messageId: message.id,
        senderId: client.user.userId,
        receiverId: payload.receiverId,
        receiverSocketId,
        connectedUsers: Array.from(this.connectedUsers.entries()),
      });

      // Send message to receiver
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('newMessage', message);
      } else {
        // Receiver is offline
        client.emit('receiverOffline', {
          receiverId: payload.receiverId,
        });
      }

      // Confirm to sender
      client.emit('messageSent', message);

      return message;
    } catch (error) {
      client.emit('errorMessage', {
        message:
          error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  }

  // =========================
  // NEW EVENT
  // sendMessage
  // =========================
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket()
    client: AuthenticatedSocket,

    @MessageBody()
    body: SendMessageDto | string | { data?: SendMessageDto },
  ) {
    try {
      // Check authentication
      if (!client.user) {
        throw new Error('Socket is not authenticated');
      }

      // Normalize body
      const sendMessageDto = this.normalizeMessageBody(body);

      // Convert receiverId to number
      const payload = {
        ...sendMessageDto,
        receiverId: Number(sendMessageDto.receiverId),
      };

      // Save message in database
      const message = await this.messagesService.sendMessage(
        client.user.userId,
        payload,
      );

      // Get receiver socket
      const receiverSocketId = this.connectedUsers.get(payload.receiverId);

      console.log('sendMessage event saved:', {
        messageId: message.id,
        senderId: client.user.userId,
        receiverId: payload.receiverId,
        receiverSocketId,
        connectedUsers: Array.from(this.connectedUsers.entries()),
      });

      // =========================
      // SEND TO RECEIVER
      // =========================
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('newMessage', message);
      } else {
        // Receiver is offline
        client.emit('receiverOffline', {
          receiverId: payload.receiverId,
        });
      }

      // =========================
      // CONFIRM TO SENDER
      // =========================
      client.emit('messageSent', message);

      return message;
    } catch (error) {
      client.emit('errorMessage', {
        message:
          error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  }

  // =========================
  // EXTRACT JWT TOKEN
  // =========================
  private extractToken(client: Socket) {
    // 1. Socket.IO auth
    const authToken = client.handshake.auth?.token;

    if (authToken) {
      return authToken;
    }

    // 2. Query parameter
    const queryToken = client.handshake.query?.token;

    if (typeof queryToken === 'string') {
      return queryToken;
    }

    // 3. Authorization header
    const authorization = client.handshake.headers.authorization;

    if (authorization && authorization.startsWith('Bearer ')) {
      return authorization.split(' ')[1];
    }

    throw new Error('Token not found');
  }

  // =========================
  // NORMALIZE MESSAGE BODY
  // =========================
  private normalizeMessageBody(
    body: SendMessageDto | string | { data?: SendMessageDto },
  ): SendMessageDto {
    // If body is string
    if (typeof body === 'string') {
      return JSON.parse(body) as SendMessageDto;
    }

    // If body is:
    // { data: {...} }
    if ('data' in body && body.data) {
      return body.data;
    }

    // Normal object
    return body as SendMessageDto;
  }

  // =========================
  // TRY NORMALIZE MESSAGE
  // =========================
  private tryNormalizeMessageBody(
    body: SendMessageDto | string | { data?: SendMessageDto },
  ): SendMessageDto | null {
    try {
      const messageDto = this.normalizeMessageBody(body);

      if (messageDto && 'receiverId' in messageDto && 'content' in messageDto) {
        return messageDto;
      }
    } catch {
      return null;
    }

    return null;
  }
}
