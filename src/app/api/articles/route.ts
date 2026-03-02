import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-utils';

export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    // Default: only show articles from the last 60 days
    const correlationWindow = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = {
        status: 'classified',
    };

    if (category) {
        where.category = category;
    }

    if (!from && !to) {
        where.publishedAt = { gte: correlationWindow };
    } else {
        const publishedAtFilter: any = {};
        if (from) publishedAtFilter.gte = new Date(from);
        if (to) publishedAtFilter.lte = new Date(to);
        if (Object.keys(publishedAtFilter).length > 0) {
            where.publishedAt = publishedAtFilter;
        }
    }

    if (search) {
        where.OR = [
            { title: { contains: search } },
            { description: { contains: search } },
            { aiSummary: { contains: search } },
        ];
    }

    const [articles, total] = await Promise.all([
        prisma.article.findMany({
            where,
            orderBy: { publishedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                title: true,
                aiSummary: true,
                aiConfidence: true,
                sourceName: true,
                publishedAt: true,
                tags: true,
                entities: true,
                url: true,
                imageUrl: true,
                category: true,
            },
        }),
        prisma.article.count({ where }),
    ]);

    const data = articles.map((a) => {
        let entities = {};
        let tags = [];
        try {
            entities = a.entities ? JSON.parse(a.entities) : {};
        } catch (e) { console.error('Entity parse error for article', a.id); }

        try {
            tags = a.tags ? JSON.parse(a.tags) : [];
        } catch (e) { console.error('Tags parse error for article', a.id); }

        return {
            id: a.id,
            title: a.title,
            summary: a.aiSummary || '',
            confidence: a.aiConfidence || 0,
            source: a.sourceName || 'Unknown',
            published_date: a.publishedAt?.toISOString() || null,
            tags,
            entities,
            url: a.url,
            imageUrl: a.imageUrl || null,
            category: a.category,
        };
    });

    return NextResponse.json({
        success: true,
        count: total,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
        },
    });
});
