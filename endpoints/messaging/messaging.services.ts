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
}
