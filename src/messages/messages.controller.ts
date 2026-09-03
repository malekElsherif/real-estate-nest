import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';

import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@Req() req: any) {
    return this.messagesService.getConversations(Number(req.user.userId));
  }

  @Get('conversation/:userId')
  getConversation(@Req() req: any, @Param('userId') userId: string) {
    return this.messagesService.getConversation(
      Number(req.user.userId),
      Number(userId),
    );
  }
}
