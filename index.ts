import { config } from 'dotenv';
import express from 'express';
import http from 'http';
import app from './app.js';
import { PORT } from './constants/urls.js';
import prisma from './prisma/client.js';
import { attachWebsocket } from './ws.js';

config();

const startServer = async () => {
    try {
        await prisma.$connect();
        console.log('Prisma connected');

        // create HTTP server from Express app so we can attach WebSocket server
        // cast the express app to Node's RequestListener for typing compatibility
        const server = http.createServer(app as unknown as http.RequestListener);

        attachWebsocket(server);

        server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
        console.error('Failed to connect to DB:', err);
        process.exit(1);
    }
};

startServer();