import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';
import { isIngestionRunning, setIngestionRunning } from '@/lib/state';

export async function POST() {
    if (await isIngestionRunning()) {
        return NextResponse.json(
            { success: false, error: 'Pipeline is already running' },
            { status: 409 }
        );
    }

    try {
        await setIngestionRunning(true);
        const result = await runPipeline('manual');
        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error('[API] Ingest error:', error);
        return NextResponse.json(
            { success: false, error: 'Pipeline failed' },
            { status: 500 }
        );
    } finally {
        await setIngestionRunning(false);
    }
}

export async function GET() {
    const isRunning = await isIngestionRunning();
    return NextResponse.json({
        success: true,
        status: isRunning ? 'running' : 'idle',
        message: 'Send POST to trigger ingestion pipeline',
    });
}
