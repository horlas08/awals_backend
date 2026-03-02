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
      content: string;
    }
  ) {

    const userId = req.userId;

    const newMessage = await prisma.message.create({
      data: {
        fromUserId: userId as string,
        toUserId: data.toUserId,
        listingId: data.listingId as string,
        content: data.content,
      },
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
        fromUser: { select: { id: true, name: true, picture: true, role: true } },
        toUser: { select: { id: true, name: true, picture: true, role: true } },
        listing: { select: { id: true, hostId: true } },
      },
    });

    const threadMap = new Map();
    for (const msg of messages) {
      const isFromMe = msg.fromUserId === userId;
      const otherUser = isFromMe ? msg.toUser : msg.fromUser;

      if (!threadMap.has(otherUser.id)) {
        let context = 'Traveling';
        if (msg.listing?.hostId === userId) {
          context = 'Hosting';
        }

        threadMap.set(otherUser.id, {
          userId: otherUser.id,
          name: otherUser.name,
          picture: otherUser.picture,
          lastMessage: msg.content,
          date: msg.createdAt,
          bookingId: msg.listingId, // Reusing for routing/UI later
          context,
        });
      }
    }

    return Array.from(threadMap.values());
  }
}
