import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';
import { cleanupOldArticles } from '@/lib/cleanup';
import { isIngestionRunning, setIngestionRunning } from '@/lib/state';

async function executeCronJob() {
    if (await isIngestionRunning()) {
        console.log('[Cron] Skipping — previous run still in progress');
        return;
    }

    try {
        await setIngestionRunning(true);
        console.log(`[Cron] Pipeline starting at ${new Date().toISOString()}`);

        // Run ingestion pipeline
        const result = await runPipeline('cron');
        console.log(`[Cron] Pipeline complete — fetched: ${result.fetched}, new: ${result.newArticles}, classified: ${result.classified}`);

        // Run cleanup (delete articles older than 30 days)
        const deleted = await cleanupOldArticles(30);
        console.log(`[Cron] Cleanup complete — removed ${deleted} old articles`);

    } catch (error) {
        console.error('[Cron] Job failed:', error instanceof Error ? error.message : error);
    } finally {
        await setIngestionRunning(false);
    }
}

// POST /api/cron — Start or stop the cron scheduler
export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'run';

    // Verify bearer token or API key in production
    if (process.env.NODE_ENV === 'production') {
        const auth = request.headers.get('authorization');
        if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
    }

    if (action === 'run') {
        executeCronJob(); // No await so it doesn't time out the request
        return NextResponse.json({ success: true, message: 'Manual run triggered' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Use: run' }, { status: 400 });
}

// GET /api/cron — Get cron status
export async function GET() {
    const isRunning = await isIngestionRunning();
    return NextResponse.json({
        success: true,
        scheduler: {
            isRunning,
            isProduction: process.env.NODE_ENV === 'production',
            message: 'Use POST to trigger the job'
        },
    });
}
