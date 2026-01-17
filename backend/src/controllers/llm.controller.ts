import { Request, Response } from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

export const chatCompletion = async (req: Request | any, res: Response) => {
  const { model, messages, temperature, max_tokens, stream } = req.body;
  const userId = req.user.id;

  const startTime = Date.now();

  try {
    const response = await axios.post(
      SILICONFLOW_API_URL,
      {
        model,
        messages,
        temperature,
        max_tokens,
        stream
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const duration = Date.now() - startTime;
    const usage = response.data.usage || {};
    
    // Log to DB
    await prisma.apiLog.create({
      data: {
        userId,
        endpoint: '/api/llm/chat',
        model: model,
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        duration,
        status: response.status,
      }
    });

    res.json(response.data);

  } catch (error: any) {
    const duration = Date.now() - startTime;
    const status = error.response ? error.response.status : 500;
    const errorMsg = error.message || 'Unknown error';

    // Log error to DB
    await prisma.apiLog.create({
      data: {
        userId,
        endpoint: '/api/llm/chat',
        model: model || 'unknown',
        duration,
        status,
        error: errorMsg
      }
    });

    console.error('LLM Call Failed:', errorMsg);
    res.status(status).json({ error: 'LLM Service Unavailable', details: errorMsg });
  }
};
