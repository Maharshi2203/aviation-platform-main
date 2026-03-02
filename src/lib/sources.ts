export interface RawArticle {
    title: string;
    content?: string;
    description?: string;
    url: string;
    sourceName: string;
    sourceUrl?: string;
    author?: string;
    imageUrl?: string;
    publishedAt?: Date;
}

export interface ClassifiedArticle {
    category: 'ACCIDENT_INCIDENT' | 'AVIATION_TRADE' | 'REGULATION' | 'GENERAL';
    confidence: number;
    summary: string;
    keyInsights: string[];
    entities: {
        airline: string | null;
        aircraft_type: string | null;
        registration: string | null;
        location: string | null;
        event_date: string | null;
        authority: string | null;
        severity: string | null;
    };
    tags: string[];
}

export interface SourceConfig {
    name: string;
    url: string;
    type: 'rss' | 'api';
    category?: string;
}

// RSS Feed Sources
export const RSS_SOURCES: SourceConfig[] = [
    // Accidents & Incidents
    {
        name: 'AeroInside',
        url: 'https://www.aeroinside.com/feed',
        type: 'rss',
    },
    {
        name: 'The Aviation Herald',
        url: 'https://avherald.com/h?subscribe=rss', 
        type: 'rss',
    },
    // Aviation Trades & Industry
    {
        name: 'Simple Flying',
        url: 'https://simpleflying.com/feed/',
        type: 'rss',
    },
    {
        name: 'AIN Online',
        url: 'https://www.ainonline.com/rss.xml',
        type: 'rss',
    },
    {
        name: 'Airways Magazine',
        url: 'https://airwaysmag.com/feed/',
        type: 'rss',
    },
    {
        name: 'Airline Reporter',
        url: 'https://www.airlinereporter.com/feed/',
        type: 'rss',
    },
    // Regulations & Authorities
    {
        name: 'FAA News',
        url: 'https://www.faa.gov/newsroom/press_releases/rss.xml',
        type: 'rss',
    },
    {
        name: 'EASA News',
        url: 'https://www.easa.europa.eu/en/rss/news.xml', // attempting common pattern
        type: 'rss',
    },
];

// Keywords for API sources
export const ACCIDENT_KEYWORDS = [
    'aviation accident',
    'plane crash',
    'aircraft crash',
    'emergency landing',
    'runway excursion',
    'aviation incident',
];

export const TRADE_KEYWORDS = [
    'aircraft delivery',
    'aircraft order',
    'airline fleet',
    'aircraft purchase',
    'aviation deal',
    'fleet expansion',
];

export const REGULATION_KEYWORDS = [
    'aviation regulation',
    'airworthiness directive',
    'FAA rule',
    'EASA directive',
    'aviation safety bulletin',
];
