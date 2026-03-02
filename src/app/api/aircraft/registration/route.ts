import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readdirSync, statSync, createReadStream } from 'fs';
import csv from 'csv-parser';

export const dynamic = 'force-dynamic';

const UA = 'AviationIQ/1.0';

function normalizeReg(reg: string): string {
    return (reg || '')
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/-/g, '');
}

/**
 * Fetch an image for a specific aircraft registration from Wikimedia Commons.
 */
async function fetchAircraftImage(registration: string): Promise<{ image: string | null; thumbnail: string | null }> {
    try {
        // 1. Search for files on Wikimedia Commons with this registration AND 'aircraft'
        // This helps filter out people or unrelated files that might match partial strings
        const query = `"${registration}" aircraft`;
        const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=10&format=json&origin=*`;

        const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': UA } });
        if (!searchRes.ok) return { image: null, thumbnail: null };

        const searchData = await searchRes.json();
        const results = searchData.query?.search || [];

        if (results.length === 0) {
            // Try one more time with just the registration if we got absolutely nothing,
            // but we'll be stricter with the title check below.
            const backupUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(registration)}&srnamespace=6&srlimit=10&format=json&origin=*`;
            const backupRes = await fetch(backupUrl, { headers: { 'User-Agent': UA } });
            if (backupRes.ok) {
                const backupData = await backupRes.json();
                results.push(...(backupData.query?.search || []));
            }
        }

        if (results.length === 0) return { image: null, thumbnail: null };

        // 2. Pick the best result
        // We look for a result that actually contains the registration in the title
        const regNorm = registration.toUpperCase().replace(/-/g, '');
        const validMatch = results.find((r: any) => {
            const title = r.title.toUpperCase().replace(/_/g, '').replace(/-/g, '');
            // Must contain registration and not look like a person's name (heuristic)
            return title.includes(regNorm) && !title.includes('PORTRAIT') && !title.includes('FACE');
        });

        if (!validMatch) return { image: null, thumbnail: null };

        const fileTitle = validMatch.title;

        // 3. Get the image properties
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|size&iiurlwidth=1200&format=json&origin=*`;

        const infoRes = await fetch(infoUrl, { headers: { 'User-Agent': UA } });
        if (!infoRes.ok) return { image: null, thumbnail: null };

        const infoData = await infoRes.json();
        const pages = infoData.query?.pages || {};
        const page = Object.values(pages)[0] as any;
        const imageInfo = page?.imageinfo?.[0];

        if (!imageInfo) return { image: null, thumbnail: null };

        return {
            image: imageInfo.url || null,
            thumbnail: imageInfo.thumburl || null
        };
    } catch (error) {
        console.error(`[fetchAircraftImage] Error fetching image for ${registration}:`, error);
        return { image: null, thumbnail: null };
    }
}

export async function GET(request: NextRequest) {
    const regParam = request.nextUrl.searchParams.get('reg');
    if (!regParam || !regParam.trim()) {
        return NextResponse.json({ success: false, error: 'reg param required' }, { status: 400 });
    }

    const targetNorm = normalizeReg(regParam);

    try {
        const sheetsDir = path.join(process.cwd(), 'Sheets');
        let dirs: string[];
        try {
            dirs = readdirSync(sheetsDir).filter((name) => {
                const full = path.join(sheetsDir, name);
                return statSync(full).isDirectory() && !name.startsWith('.');
            });
        } catch {
            return NextResponse.json({ success: false, error: 'Sheets folder not found' }, { status: 404 });
        }

        for (const dir of dirs) {
            const folderPath = path.join(sheetsDir, dir);
            const files = readdirSync(folderPath).filter((f) => f.endsWith('.csv'));

            for (const file of files) {
                const fullPath = path.join(folderPath, file);
                const lower = file.toLowerCase();
                const category =
                    lower.includes('special') ? 'special' :
                        (lower.includes('historic') || lower.includes('history')) ? 'historic' :
                            lower.includes('current') ? 'current' :
                                'other';

                const foundRow = await new Promise<Record<string, string> | null>((resolve, reject) => {
                    let matched: Record<string, string> | null = null;
                    createReadStream(fullPath)
                        .pipe(csv())
                        .on('data', (row: Record<string, string>) => {
                            if (matched) return;
                            const r = normalizeReg(row.REG || row.reg || '');
                            if (r && r === targetNorm) {
                                matched = row;
                            }
                        })
                        .on('end', () => resolve(matched))
                        .on('error', (err) => reject(err));
                });

                if (foundRow) {
                    // Fetch specific aircraft image
                    const imageData = await fetchAircraftImage(regParam.trim());

                    return NextResponse.json({
                        success: true,
                        registration: regParam.trim().toUpperCase(),
                        airlineFolder: dir,
                        airlineName: dir.replace(/[_-]+/g, ' '),
                        category,
                        row: foundRow,
                        image: imageData.image,
                        thumbnail: imageData.thumbnail
                    });
                }
            }
        }

        // Even if not found in Sheets, still try to fetch an image if it's a valid looking registration
        const imageData = await fetchAircraftImage(regParam.trim());
        if (imageData.image) {
            return NextResponse.json({
                success: true,
                registration: regParam.trim().toUpperCase(),
                airlineName: null,
                category: 'unknown',
                image: imageData.image,
                thumbnail: imageData.thumbnail
            });
        }

        return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
    } catch (error) {
        console.error('[Aircraft registration API]', error);
        return NextResponse.json({ success: false, error: 'Failed to search registration' }, { status: 500 });
    }
}

