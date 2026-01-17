import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { generateReport } from '../controllers/stats.controller';

const prisma = new PrismaClient();

export const initCronJobs = () => {
    // Daily Report at 00:00
    cron.schedule('0 0 * * *', async () => {
        console.log('Running Daily Report Job');
        const users = await prisma.user.findMany();
        for (const user of users) {
            await generateReport(user.id, 'daily');
        }
    });

    // Weekly Report at 00:00 on Sunday
    cron.schedule('0 0 * * 0', async () => {
        console.log('Running Weekly Report Job');
        const users = await prisma.user.findMany();
        for (const user of users) {
            await generateReport(user.id, 'weekly');
        }
    });
};
