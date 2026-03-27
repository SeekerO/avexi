// src/app/sitemap.ts
// Next.js App Router sitemap generator
// Place this file at: src/app/sitemap.ts

import { MetadataRoute } from "next";

const BASE_URL = "https://avexi.digital"; // ← update to your domain

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();

    return [
        // ── Public pages ─────────────────────────────────────────────
        {
            url: BASE_URL,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/login`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.9,
        },
        // Note: All other pages require authentication.
        // Do NOT add authenticated routes to the sitemap.
        // Google won't be able to crawl them and it hurts your SEO score.
    ];
}