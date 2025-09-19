// content of seed-cafes.tsseed-cafes.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { onFirstApiKeySetup } from "@/services/scheduledService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = req.headers["x-admin-key"];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await onFirstApiKeySetup();
    return res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("Error seeding cafes:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
}
