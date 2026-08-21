/**
 * OpenBook reader styles, injected as one <style> tag by the client apply.
 * Self-contained design tokens; no dependency on the dsh theme system.
 */
export const RSS_CSS = `
.openbook-rss {
  --ob-bg: #f6f5f1;
  --ob-panel: #ffffff;
  --ob-border: #e4e1d8;
  --ob-text: #2c2a26;
  --ob-muted: #8a8577;
  --ob-accent: #b4552d;
  --ob-accent-soft: #f3e4da;
  --ob-radius: 8px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--ob-bg);
  color: var(--ob-text);
  font-size: 13px;
}
.openbook-rss * { box-sizing: border-box; }
.openbook-rss .ob-tabs { display: flex; gap: 4px; padding: 8px 12px; background: var(--ob-panel); border-bottom: 1px solid var(--ob-border); }
.openbook-rss .ob-tab { border: none; background: transparent; color: var(--ob-muted); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.openbook-rss .ob-tab.active { background: var(--ob-accent-soft); color: var(--ob-accent); font-weight: 600; }
.openbook-rss .ob-toolbar { display: flex; gap: 8px; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--ob-border); background: var(--ob-panel); }
.openbook-rss .ob-btn { border: 1px solid var(--ob-border); background: var(--ob-panel); color: var(--ob-text); border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 12px; }
.openbook-rss .ob-btn:hover { border-color: var(--ob-accent); color: var(--ob-accent); }
.openbook-rss .ob-btn.primary { background: var(--ob-accent); border-color: var(--ob-accent); color: #fff; }
.openbook-rss .ob-btn.primary:disabled { opacity: 0.5; cursor: default; }
.openbook-rss .ob-status { color: var(--ob-muted); font-size: 12px; }

.openbook-rss .ob-body { display: flex; flex: 1; min-height: 0; }
.openbook-rss .ob-sidebar { width: 230px; min-width: 230px; border-right: 1px solid var(--ob-border); background: var(--ob-panel); overflow-y: auto; }
.openbook-rss .ob-sidebar-title { padding: 10px 12px 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ob-muted); }
.openbook-rss .ob-feed { display: block; width: 100%; text-align: left; border: none; background: transparent; padding: 7px 12px; cursor: pointer; color: var(--ob-text); font-size: 13px; }
.openbook-rss .ob-feed:hover { background: var(--ob-accent-soft); }
.openbook-rss .ob-feed.active { background: var(--ob-accent-soft); color: var(--ob-accent); font-weight: 600; }
.openbook-rss .ob-feed .ob-feed-meta { display: block; color: var(--ob-muted); font-size: 11px; font-weight: 400; }

.openbook-rss .ob-list { width: 300px; min-width: 300px; border-right: 1px solid var(--ob-border); background: var(--ob-panel); overflow-y: auto; }
.openbook-rss .ob-list-header { padding: 10px 12px; border-bottom: 1px solid var(--ob-border); display: flex; align-items: center; justify-content: space-between; }
.openbook-rss .ob-date-nav { display: flex; gap: 4px; }
.openbook-rss .ob-item { display: block; width: 100%; text-align: left; border: none; border-bottom: 1px solid var(--ob-border); background: transparent; padding: 10px 12px; cursor: pointer; }
.openbook-rss .ob-item:hover { background: var(--ob-accent-soft); }
.openbook-rss .ob-item.active { background: var(--ob-accent-soft); border-left: 3px solid var(--ob-accent); }
.openbook-rss .ob-item.unread .ob-item-title { font-weight: 700; }
.openbook-rss .ob-item-title { font-size: 13px; line-height: 1.35; color: var(--ob-text); }
.openbook-rss .ob-item-meta { font-size: 11px; color: var(--ob-muted); margin-top: 4px; display: flex; gap: 6px; }
.openbook-rss .ob-item-dot { color: var(--ob-accent); }

.openbook-rss .ob-reader { flex: 1; min-width: 0; overflow-y: auto; background: var(--ob-panel); padding: 24px 28px; }
.openbook-rss .ob-reader h1 { font-size: 22px; line-height: 1.3; margin: 0 0 8px; }
.openbook-rss .ob-reader .ob-article-meta { color: var(--ob-muted); font-size: 12px; margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.openbook-rss .ob-reader .ob-article-body { font-size: 14px; line-height: 1.7; }
.openbook-rss .ob-reader .ob-article-body img { max-width: 100%; }
.openbook-rss .ob-reader .ob-article-body pre { background: #f0eee8; padding: 12px; border-radius: 6px; overflow-x: auto; }
.openbook-rss .ob-reader .ob-article-body code { background: #f0eee8; padding: 1px 4px; border-radius: 4px; }
.openbook-rss .ob-empty { color: var(--ob-muted); text-align: center; padding: 48px 24px; }
.openbook-rss .ob-note-editor { margin-top: 16px; border-top: 1px solid var(--ob-border); padding-top: 12px; }
.openbook-rss .ob-note-editor textarea { width: 100%; min-height: 90px; border: 1px solid var(--ob-border); border-radius: 6px; padding: 8px; font: inherit; resize: vertical; }
.openbook-rss .ob-note-editor .ob-note-actions { display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end; }

.openbook-rss .ob-notes { flex: 1; overflow-y: auto; padding: 16px; background: var(--ob-panel); }
.openbook-rss .ob-note-card { border: 1px solid var(--ob-border); border-radius: var(--ob-radius); padding: 12px 14px; margin-bottom: 10px; }
.openbook-rss .ob-note-card .ob-note-title { font-weight: 600; margin-bottom: 4px; }
.openbook-rss .ob-note-card .ob-note-meta { color: var(--ob-muted); font-size: 11px; margin-top: 6px; }

.openbook-rss .ob-status-view { flex: 1; overflow-y: auto; padding: 16px; background: var(--ob-panel); }
.openbook-rss .ob-stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-bottom: 16px; }
.openbook-rss .ob-stat { border: 1px solid var(--ob-border); border-radius: var(--ob-radius); padding: 10px 12px; }
.openbook-rss .ob-stat .ob-stat-value { font-size: 20px; font-weight: 700; }
.openbook-rss .ob-stat .ob-stat-label { font-size: 11px; color: var(--ob-muted); }
.openbook-rss .ob-activity { border-top: 1px solid var(--ob-border); padding-top: 12px; }
.openbook-rss .ob-activity-row { padding: 6px 0; border-bottom: 1px dashed var(--ob-border); font-size: 12px; }
`
