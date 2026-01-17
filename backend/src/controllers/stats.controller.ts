import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getUsageStats = async (req: Request | any, res: Response) => {
  const userId = req.user.id;
  
  try {
    const logs = await prisma.apiLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const totalCalls = await prisma.apiLog.count({ where: { userId } });
    
    // Simple aggregation
    const usageByModel = await prisma.apiLog.groupBy({
      by: ['model'],
      where: { userId },
      _count: {
        model: true
      },
      _sum: {
        totalTokens: true
      }
    });

    res.json({
      totalCalls,
      usageByModel,
      recentLogs: logs
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

export const generateReport = async (userId: number, type: 'daily' | 'weekly') => {
    // This function can be called by Cron Job
    const now = new Date();
    let startDate = new Date();
    if (type === 'daily') {
        startDate.setDate(now.getDate() - 1);
    } else {
        startDate.setDate(now.getDate() - 7);
    }

    const logs = await prisma.apiLog.findMany({
        where: {
            userId,
            createdAt: {
                gte: startDate,
                lte: now
            }
        }
    });

    const totalTokens = logs.reduce((acc, log) => acc + (log.totalTokens || 0), 0);
    const callCount = logs.length;
    
    const reportData = {
        totalTokens,
        callCount,
        averageDuration: logs.length ? logs.reduce((acc, log) => acc + log.duration, 0) / logs.length : 0
    };

    await prisma.report.create({
        data: {
            userId,
            type,
            startDate,
            endDate: now,
            data: JSON.stringify(reportData),
            aiComment: `Generated automatically for ${callCount} calls.` // Placeholder for real AI analysis
        }
    });
};
