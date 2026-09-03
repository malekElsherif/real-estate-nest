import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { Message } from './entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // ==============================
  // SEND MESSAGE
  // ==============================

  async sendMessage(senderId: number, sendMessageDto: SendMessageDto) {
    const receiverId = Number(sendMessageDto.receiverId);

    if (!receiverId || !sendMessageDto.content?.trim()) {
      throw new BadRequestException('receiverId and content are required');
    }

    if (senderId === receiverId) {
      throw new BadRequestException('You cannot send a message to yourself');
    }

    const receiver = await this.usersRepository.findOne({
      where: {
        id: receiverId,
      },
    });

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    const message = this.messagesRepository.create({
      content: sendMessageDto.content.trim(),
      senderId,
      receiverId,
    });

    return this.messagesRepository.save(message);
  }

  // ==============================
  // GET ONE CONVERSATION
  // ==============================

  async getConversation(currentUserId: number, otherUserId: number) {
    const userId = Number(otherUserId);

    const otherUser = await this.usersRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!otherUser) {
      throw new NotFoundException('User not found');
    }

    return this.messagesRepository.find({
      where: [
        {
          senderId: currentUserId,
          receiverId: userId,
        },
        {
          senderId: userId,
          receiverId: currentUserId,
        },
      ],
      order: {
        createdAt: 'ASC',
      },
    });
  }

  // ==============================
  // GET ALL CONVERSATIONS
  // ==============================

  async getConversations(currentUserId: number) {
    const messages = await this.messagesRepository.find({
      where: [
        {
          senderId: currentUserId,
        },
        {
          receiverId: currentUserId,
        },
      ],
      order: {
        createdAt: 'DESC',
      },
    });

    const conversationsMap = new Map<number, Message>();

    for (const message of messages) {
      const otherUserId =
        Number(message.senderId) === Number(currentUserId)
          ? Number(message.receiverId)
          : Number(message.senderId);

      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, message);
      }
    }

    const conversations: {
      userId: number;
      userName: string;
      lastMessage: string;
      lastMessageTime: Date;
    }[] = [];

    for (const [userId, lastMessage] of conversationsMap) {
      const user = await this.usersRepository.findOne({
        where: {
          id: userId,
        },
      });

      if (!user) continue;

      conversations.push({
        userId: user.id,
        userName: user.name,
        lastMessage: lastMessage.content,
        lastMessageTime: lastMessage.createdAt,
      });
    }

    return conversations;
  }
}
