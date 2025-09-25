// /api/test.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(200).json({ 
    message: 'API endpoint working!',
    cwd: process.cwd(),
    env: !!process.env.GOOGLE_PLACES_API_KEY
  });
}
