import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: ['/$', '/login$'],
            disallow: [
                '/dashboard',
                '/admin/',
                '/Edit/',
                '/Documents/',
                '/Matcher',
                '/message',
                '/directory/',
                '/csc',
                '/dtrextractor',
                '/not-found',
                '/api/',
            ],
        },
        sitemap: 'https://avexi.digital/sitemap.ts',
    };
}