import { config } from 'dotenv';
import app from './app.js';
import { PORT } from './constants/urls.js';
import prisma from './prisma/client.js';

config();


const startServer = async () => {
    try {
        await prisma.$connect();
        console.log("Prisma connected");

        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
        console.error("Failed to connect to DB:", err);
        process.exit(1);
    }
};


startServer();