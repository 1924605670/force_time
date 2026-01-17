import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  const { username, password, openid, role } = req.body;
  
  try {
    let user;
    if (openid) {
      // WeChat User
      user = await prisma.user.create({
        data: { openid, role: role || 'user' }
      });
    } else if (username && password) {
      // Admin/Standard User
      // In production, password should be hashed!
      user = await prisma.user.create({
        data: { username, password, openid: `admin_${Date.now()}`, role: role || 'user' }
      });
    } else {
      res.status(400).json({ error: 'Missing credentials' });
      return;
    }
    res.status(201).json({ message: 'User created', userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'User creation failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password, openid } = req.body;

  try {
    let user;
    if (openid) {
      user = await prisma.user.findUnique({ where: { openid } });
    } else if (username && password) {
      // In production, compare hashed password
      user = await prisma.user.findFirst({ where: { username, password } });
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, openid: user.openid },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
};
