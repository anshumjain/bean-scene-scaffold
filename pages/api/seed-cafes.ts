// pages/api/seed-cafes.ts
import type { NextApiRequest, NextApiResponse } from "next";
import 'dotenv/config'; // ensure env variables are loaded
import { onFirstApiKeySetup } from "@/services/scheduledService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST for security
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Basic admin check using a secret API key
  const adminKey = process.env.ADMIN_API_KEY; // set in Vercel env
  if (!req.headers.authorization || req.headers.authorization !== `Bearer ${adminKey}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await onFirstApiKeySetup();
    return res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("Error running initial seed:", err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : err });
  }
}
