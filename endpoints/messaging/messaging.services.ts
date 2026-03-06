import type { IMessage } from "./messaging.type.js";
import type { Request } from "express";
import prisma from "../../prisma/client.js";

export default class MessagingService {

  // ------------------------------------------------------------
  // SEND MESSAGE
  // ------------------------------------------------------------
  static async sendMessage(
    req: Request & { userId: string },
    data: {
      toUserId: string;
      listingId?: string;
      bookingId?: string;
      content: string;
    }
  ) {

    const userId = req.userId;

    const newMessage = await prisma.message.create({
      data: {
        fromUserId: userId as string,
        toUserId: data.toUserId,
        listingId: data.listingId as any,
        bookingId: data.bookingId as any,
        content: data.content,
      } as any,
    });

    return newMessage;
  }

  // ------------------------------------------------------------
  // GET MESSAGES BETWEEN TWO USERS
  // ------------------------------------------------------------
  static async getMessages(
    req: Request & { userId: string },
    recipientId: string
  ) {

    const userId = req.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            fromUserId: userId,
            toUserId: recipientId,
          },
          {
            fromUserId: recipientId,
            toUserId: userId,
          }
        ]
      },
      orderBy: {
        createdAt: "asc", // sorting like Mongoose .sort({ createdAt: 1 })
      }
    });

    return messages;
  }

  // ------------------------------------------------------------
  // GET INBOX THREADS FOR USER
  // ------------------------------------------------------------
  static async getInbox(userId: string) {
    // Find all distinct other users we have messages with
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { id: true, name: true, picture: true, role: true, lastSeen: true } },
        toUser: { select: { id: true, name: true, picture: true, role: true, lastSeen: true } },
        listing: { select: { id: true, hostId: true } },
      },
    });

    const threadMap = new Map();
    for (const msg of messages) {
      const isFromMe = msg.fromUserId === userId;
      const otherUser = (isFromMe ? msg.toUser : msg.fromUser) as any;

      if (!threadMap.has(otherUser.id)) {
        let context = 'Conversation';
        if ((msg as any).listing?.hostId === userId) {
          context = 'Hosting';
        } else if ((msg as any).bookingId || (msg as any).listingId) {
          context = 'Traveling';
        }

        // Calculate unread count for this thread
        // This is a bit inefficient for large inboxes, but simplified for now
        const unreadCount = await prisma.message.count({
          where: {
            fromUserId: otherUser.id,
            toUserId: userId,
            isRead: false
          }
        });

        const isOnline = otherUser.lastSeen
          ? (new Date().getTime() - new Date(otherUser.lastSeen).getTime() < 120000) // 2 mins
          : false;

        threadMap.set(otherUser.id, {
          userId: otherUser.id,
          name: otherUser.name,
          picture: otherUser.picture,
          lastMessage: msg.content,
          date: msg.createdAt,
          bookingId: (msg as any).bookingId || (msg as any).listingId,
          context,
          unreadCount,
          isOnline
        });
      }
    }

    return Array.from(threadMap.values());
  }

  static async markAsRead(userId: string, recipientId: string) {
    await prisma.message.updateMany({
      where: {
        fromUserId: recipientId,
        toUserId: userId,
        isRead: false
      },
      data: {
        isRead: true
      } as any
    });
    return { success: true };
  }
}
