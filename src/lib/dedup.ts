import CryptoJS from 'crypto-js';
import { prisma } from './db';
import { RawArticle } from './sources';

export function hashUrl(url: string): string {
    const normalized = url.trim().toLowerCase().replace(/\/+$/, '');
    return CryptoJS.SHA256(normalized).toString();
}

export async function isDuplicate(url: string): Promise<boolean> {
    const hash = hashUrl(url);
    const existing = await prisma.article.findUnique({
        where: { urlHash: hash },
    });
    return !!existing;
}

export async function filterDuplicates(articles: RawArticle[]): Promise<RawArticle[]> {
    if (articles.length === 0) return [];

    const hashes = articles.map(a => hashUrl(a.url));
    const existing = await prisma.article.findMany({
        where: {
            urlHash: { in: hashes },
        },
        select: { urlHash: true },
    });

    const existingHashes = new Set(existing.map(e => e.urlHash));

    // Also track local duplicates within the current fetch
    const seenLocal = new Set<string>();

    return articles.filter(article => {
        const hash = hashUrl(article.url);
        if (existingHashes.has(hash) || seenLocal.has(hash)) {
            return false;
        }
        seenLocal.add(hash);
        return true;
    });
}
