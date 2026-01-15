import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import prisma from './prisma/client.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const clients = new Set();

export function attachWebsocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (socket) => {
    const client = { ws: socket };
    clients.add(client);

    socket.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'auth') {
          try {
            const payload = jwt.verify(msg.token, JWT_SECRET);
            client.userId = payload.id;
            socket.send(JSON.stringify({ type: 'auth_ok' }));
          } catch (err) {
            socket.send(JSON.stringify({ type: 'auth_error', error: 'invalid token' }));
            socket.close();
          }
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
          const userId = client.userId;
          // booking.guestId and booking.listingId - need to load listing
          const listing = await prisma.listing.findUnique({ where: { id: booking.listingId } });
          const isGuest = booking.guestId === userId;
          const isHost = listing && listing.hostId === userId;
          if (!isGuest && !isHost) {
            socket.send(JSON.stringify({ type: 'error', error: 'not allowed to join this chat' }));
            return;
          }
          client.bookingId = msg.bookingId;
          socket.send(JSON.stringify({ type: 'joined', bookingId: msg.bookingId }));
        }

        if (msg.type === 'message') {
          if (!client.userId) return;
          const bookingId = msg.bookingId;
          const text = msg.text;
          for (const c of clients) {
            if (c.bookingId === bookingId) {
              c.ws.send(JSON.stringify({ type: 'message', from: client.userId, bookingId, text, time: new Date().toISOString() }));
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
