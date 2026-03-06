import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import prisma from './prisma/client.js';
import type { Server as HttpServer } from 'http';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

type Client = {
    ws: WebSocket;
    userId?: string | number;
    bookingId?: string;
};

const clients = new Set<Client>();
const userSockets = new Map<string | number, Set<WebSocket>>();

export function attachWebsocket(server: HttpServer) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (socket: WebSocket) => {
        const client: Client = { ws: socket };
        clients.add(client);

        socket.on('message', async (data) => {
            try {
                const raw = typeof data === 'string' ? data : data.toString();
                const msg = JSON.parse(raw) as Record<string, any>;

                if (msg.type === 'auth') {
                    try {
                        const payload = jwt.verify(msg.token, JWT_SECRET) as any;
                        const userId = payload?.id ?? payload?.sub ?? undefined;

                        if (userId) {
                            client.userId = userId;

                            // Map userId to socket
                            if (!userSockets.has(userId)) {
                                userSockets.set(userId, new Set());
                            }
                            userSockets.get(userId)!.add(socket);

                            // Broadcast online status
                            broadcastPresence(userId, 'online');

                            // Update lastSeen in DB (async, non-blocking)
                            prisma.user.update({
                                where: { id: userId.toString() },
                                data: { lastSeen: new Date() }
                            }).catch(() => { });
                        }

                        socket.send(JSON.stringify({ type: 'auth_ok' }));
                    } catch (err) {
                        socket.send(JSON.stringify({ type: 'auth_error', error: 'invalid token' }));
                        try { socket.close(); } catch (_) { }
                    }
                    return;
                }

                if (msg.type === 'presence_request') {
                    const requestedUserId = msg.userId;
                    const isOnline = userSockets.has(requestedUserId);
                    socket.send(JSON.stringify({
                        type: 'presence',
                        userId: requestedUserId,
                        status: isOnline ? 'online' : 'offline'
                    }));
                    return;
                }

                if (msg.type === 'joinBooking') {
                    if (!client.userId) {
                        socket.send(JSON.stringify({ type: 'error', error: 'not authenticated' }));
                        return;
                    }
                    const booking = await prisma.booking.findUnique({ where: { id: msg.bookingId } });
                    if (!booking) {
                        socket.send(JSON.stringify({ type: 'error', error: 'booking not found' }));
                        return;
                    }
                    const isGuest = booking.guestId === client.userId;

                    // Chat host verification is only supported for place listings.
                    // Service/experience bookings do not have a Listing to reference here.
                    let isHost = false;
                    if (typeof booking.listingId === 'string' && booking.listingId.trim().length > 0) {
                        const listing = await prisma.listing.findUnique({ where: { id: booking.listingId } });
                        isHost = !!(listing && listing.hostId === client.userId);
                    }

                    if (!isGuest && !isHost) {
                        socket.send(JSON.stringify({ type: 'error', error: 'not allowed to join this chat' }));
                        return;
                    }
                    client.bookingId = msg.bookingId;
                    socket.send(JSON.stringify({ type: 'joined', bookingId: msg.bookingId }));
                    return;
                }

                if (msg.type === 'message') {
                    if (!client.userId) return;
                    const bookingId = msg.bookingId as string | undefined;
                    const recipientId = msg.recipientId as string | undefined;
                    const text = msg.text as string | undefined;

                    if (!text) return;

                    const payload = {
                        type: 'message',
                        payload: {
                            from: client.userId,
                            recipientId,
                            bookingId,
                            text,
                            time: new Date().toISOString()
                        },
                    };

                    // Send to specific booking room if bookingId exists
                    if (bookingId) {
                        for (const c of clients) {
                            if (c.bookingId === bookingId) {
                                try {
                                    c.ws.send(JSON.stringify(payload));
                                } catch (e) {
                                    // ignore
                                }
                            }
                        }
                    }

                    // Also always send to recipient's personal sockets for real-time inbox updates
                    if (recipientId && userSockets.has(recipientId)) {
                        for (const s of userSockets.get(recipientId)!) {
                            try {
                                s.send(JSON.stringify(payload));
                            } catch (e) { }
                        }
                    }
                }
            } catch (err) {
                console.error('ws message error', err);
            }
        });

        socket.on('close', () => {
            if (client.userId) {
                const sockets = userSockets.get(client.userId);
                if (sockets) {
                    sockets.delete(socket);
                    if (sockets.size === 0) {
                        userSockets.delete(client.userId);
                        broadcastPresence(client.userId, 'offline');

                        // Update lastSeen in DB
                        prisma.user.update({
                            where: { id: client.userId.toString() },
                            data: { lastSeen: new Date() }
                        }).catch(() => { });
                    }
                }
            }
            clients.delete(client);
        });
    });

    function broadcastPresence(userId: string | number, status: 'online' | 'offline') {
        const payload = JSON.stringify({ type: 'presence', userId, status });
        for (const c of clients) {
            try {
                c.ws.send(payload);
            } catch (e) { }
        }
    }

    console.log('WebSocket server attached');
}

export default attachWebsocket;
