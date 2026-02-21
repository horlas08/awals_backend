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
                        client.userId = payload?.id ?? payload?.sub ?? undefined;
                        socket.send(JSON.stringify({ type: 'auth_ok' }));
                    } catch (err) {
                        socket.send(JSON.stringify({ type: 'auth_error', error: 'invalid token' }));
                        try { socket.close(); } catch (_) { }
                    }
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
                    const text = msg.text as string | undefined;
                    if (!bookingId || !text) return;

                    const payload = {
                        type: 'message',
                        payload: { from: client.userId, bookingId, text, time: new Date().toISOString() },
                    };

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
            } catch (err) {
                console.error('ws message error', err);
            }
        });

        socket.on('close', () => {
            clients.delete(client);
        });
    });

    console.log('WebSocket server attached');
}

export default attachWebsocket;
