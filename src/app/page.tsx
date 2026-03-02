'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import LoadingAnimation from '@/components/LoadingAnimation';

interface Stats {
  total: number;
  accidents: number;
  trades: number;
  regulations: number;
  general: number;
  pending: number;
  failed: number;
  last24h: number;
  lastUpdated: string | null;
  lastIngestion: {
    timestamp: string;
    fetched: number;
    newArticles: number;
    classified: number;
    failed: number;
    durationMs: number;
    triggeredBy: string;
  } | null;
  sources: { name: string; count: number }[];
}

interface Article {
  id: string;
  title: string;
  aiSummary: string;
  category: string;
  aiConfidence: number;
  sourceName: string;
  publishedAt: string;
  tags: string[];
  entities: Record<string, string | null>;
  url: string;
  imageUrl: string | null;
}

interface PipelineResult {
  fetched: number;
  newArticles: number;
  classified: number;
  failed: number;
  durationMs: number;
}

interface SchedulerStatus {
  active: boolean;
  intervalMinutes: number;
  isRunning: boolean;
  lastRun: string | null;
  runCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [health, setHealth] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, articlesRes, cronRes, healthRes] = await Promise.all([
        fetch('/api/articles/stats'),
        fetch('/api/articles?limit=9'),
        fetch('/api/cron'),
        fetch('/api/health'),
      ]);
      const statsData = await statsRes.json();
      const articlesData = await articlesRes.json();
      const cronData = await cronRes.json();
      const healthData = await healthRes.json();

      if (statsData.success) setStats(statsData.stats);
      if (articlesData.success) setRecentArticles(articlesData.data);
      if (cronData.success) setScheduler(cronData.scheduler);
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const triggerIngestion = async () => {
    setIngesting(true);
    setPipelineResult(null);
    try {
      const res = await fetch('/api/ingest', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPipelineResult(data.result);
        fetchData(); // Refresh stats
      } else if (res.status === 409) {
        if (confirm('A pipeline is already running. If it is stuck, would you like to clear the lock?')) {
          await clearLock();
        }
      }
    } catch (error) {
      console.error('Ingestion failed:', error);
    } finally {
      setIngesting(false);
    }
  };

  const clearLock = async () => {
    try {
      const res = await fetch('/api/ingest/clear-lock', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Pipeline lock cleared. You can now fetch news.');
        fetchData();
      }
    } catch (error) {
      console.error('Clear lock failed:', error);
    }
  };

  const getCategoryClass = (cat: string) => {
    switch (cat) {
      case 'ACCIDENT_INCIDENT': return 'accident';
      case 'AVIATION_TRADE': return 'trade';
      case 'REGULATION': return 'regulation';
      default: return 'general';
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'ACCIDENT_INCIDENT': return '🔴 Accident';
      case 'AVIATION_TRADE': return '💼 Trade';
      case 'REGULATION': return '📜 Regulation';
      default: return '📰 General';
    }
  };

  const getConfidenceClass = (conf: number) => {
    if (conf >= 0.8) return 'high';
    if (conf >= 0.5) return 'medium';
    return 'low';
  };

  const featuredArticle = recentArticles[0] || null;
  const trendingArticles = recentArticles.slice(1, 4);
  const gridArticles = recentArticles.slice(4);

  if (loading) {
    return <LoadingAnimation message="Loading dashboard..." fullScreen />;
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1>AviationIQ Dashboard</h1>
          <p>Premium aviation intelligence — news, fleets and risks in one view.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchData}
            className="btn btn-ghost"
            disabled={loading}
            title="Refresh board data"
          >
            {loading ? '...' : '🔄'}
          </button>
          <button
            onClick={triggerIngestion}
            className={`btn ${ingesting ? 'btn-loading' : 'btn-primary'}`}
            disabled={ingesting}
            style={{ minWidth: '140px' }}
          >
            {ingesting ? (
              '🚀 Ingesting...'
            ) : (
              <>
                <span style={{ marginRight: '8px' }}>⚡</span>
                Fetch News
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Articles</div>
          <div className="stat-value">{stats?.total || 0}</div>
          <div className="stat-trend">Database Status: {stats ? 'Connected' : 'Connecting...'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Accidents</div>
          <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{stats?.accidents || 0}</div>
          <div className="stat-trend">Last 15 days</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Industry Trades</div>
          <div className="stat-value" style={{ color: 'var(--accent-orange)' }}>{stats?.trades || 0}</div>
          <div className="stat-trend">Market Intelligence</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">New in 24h</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats?.last24h || 0}</div>
          <div className="stat-trend">Flash Updates</div>
        </div>
      </div>

      {pipelineResult && (
        <div className="alert alert-success" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <strong>🚀 Pipeline Complete:</strong> Fetched {pipelineResult.fetched} articles,
              found {pipelineResult.newArticles} new, classified {pipelineResult.classified}.
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPipelineResult(null)}>✕</button>
          </div>
        </div>
      )}

      {health?.status === 'degraded' && (
        <div className="alert alert-warning" style={{ marginBottom: '32px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
          <div>
            <strong>⚠️ System Degraded:</strong> {health.checks.database === 'disconnected' ? 'Database is not connected.' : 'Some features may be limited.'}
            {Object.entries(health.checks).filter(([k, v]: any) => v.includes('missing')).map(([k, v]: any) => (
              <div key={k} style={{ fontSize: '0.8rem', marginTop: '4px' }}>• {k.replace('_', ' ')} is missing.</div>
            ))}
          </div>
        </div>
      )}

      {/* Hero layout: Featured + Trending */}
      {featuredArticle && (
        <div className="aviationiq-main-grid">
          {/* Featured article */}
          <Link href={`/articles/${featuredArticle.id}`} className="featured-article-card">
            <div className="featured-image-wrapper">
              {featuredArticle.imageUrl ? (
                <img src={featuredArticle.imageUrl} alt={featuredArticle.title} loading="lazy" />
              ) : (
                <div className="featured-image-placeholder">✈️</div>
              )}
              <div className="featured-gradient" />
              <div className="featured-category-pill">AVIATION</div>
            </div>
            <div className="featured-body">
              <h2 className="featured-title">{featuredArticle.title}</h2>
              {featuredArticle.aiSummary && (
                <p className="featured-summary">
                  {featuredArticle.aiSummary.length > 220
                    ? `${featuredArticle.aiSummary.slice(0, 220)}…`
                    : featuredArticle.aiSummary}
                </p>
              )}
              <div className="featured-meta-row">
                <span className="meta-item">📡 {featuredArticle.sourceName || 'Unknown source'}</span>
                {featuredArticle.publishedAt && (
                  <span className="meta-item">
                    🕒 {new Date(featuredArticle.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
                <span className="meta-item">⏱ 4 min read</span>
              </div>
              {featuredArticle.tags && featuredArticle.tags.length > 0 && (
                <div className="featured-tags">
                  {featuredArticle.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>

          {/* Trending list */}
          <div className="trending-card">
            <div className="trending-header">
              <h3>Trending Now</h3>
              <Link href="/articles" className="trending-view-all">
                View All →
              </Link>
            </div>
            <div className="trending-list">
              {trendingArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="trending-item"
                >
                  <div className="trending-thumb">
                    {article.imageUrl ? (
                      <img src={article.imageUrl} alt={article.title} loading="lazy" />
                    ) : (
                      <div className="trending-thumb-placeholder">✈️</div>
                    )}
                  </div>
                  <div className="trending-content">
                    <div className="trending-title">{article.title}</div>
                    <div className="trending-meta">
                      <span>{article.sourceName || 'Unknown'}</span>
                      {article.publishedAt && (
                        <span>
                          {new Date(article.publishedAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              {trendingArticles.length === 0 && (
                <div className="trending-empty">More articles will appear here as they are ingested.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Articles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '32px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Recent Articles</h2>
        <Link href="/articles" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
          View All →
        </Link>
      </div>

      {gridArticles.length > 0 ? (
        <div className="articles-grid">
          {gridArticles.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.id}`}
              className="article-card"
            >
              {article.imageUrl ? (
                <div className="article-image-wrapper">
                  <img src={article.imageUrl} alt={article.title} loading="lazy" />
                  <div className="image-overlay" />
                </div>
              ) : (
                <div className="article-image-placeholder">
                  {getCategoryLabel(article.category).split(' ')[0]}
                </div>
              )}
              <div className="article-body">
                <div className="article-header">
                  <h3 className="article-title">{article.title}</h3>
                  <span className={`category-badge ${getCategoryClass(article.category)}`}>
                    {getCategoryLabel(article.category)}
                  </span>
                </div>
                {article.aiSummary && (
                  <p className="article-summary">{article.aiSummary}</p>
                )}
                <div className="article-meta">
                  <span className="meta-item">📡 {article.sourceName || 'Unknown'}</span>
                  {article.publishedAt && (
                    <span className="meta-item">
                      🕐 {new Date(article.publishedAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                  )}
                  {article.aiConfidence && (
                    <div className="confidence-meter">
                      <div className="confidence-bar">
                        <div
                          className={`fill ${getConfidenceClass(article.aiConfidence)}`}
                          style={{ width: `${article.aiConfidence * 100}%` }}
                        />
                      </div>
                      <span className="confidence-value">
                        {(article.aiConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
                {article.tags && article.tags.length > 0 && (
                  <div className="article-tags">
                    {article.tags.slice(0, 5).map((tag, i) => (
                      <span key={i} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ background: 'rgba(255,255,255,0.02)', padding: '60px', borderRadius: '24px', border: '1px dashed var(--border-medium)' }}>
          <div className="empty-icon">🛫</div>
          <h3>No additional recent articles</h3>
          <p style={{ marginBottom: '24px' }}>Ingest more news to fill out the grid below the featured and trending stories.</p>
          <button
            onClick={triggerIngestion}
            className={`btn ${ingesting ? 'btn-loading' : 'btn-primary'}`}
            disabled={ingesting}
          >
            {ingesting ? '🚀 Ingesting...' : '⚡ Fetch News Now'}
          </button>
        </div>
      )}

    </div>
  );
}
