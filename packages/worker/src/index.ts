import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { verifyJWT } from './routes/auth';
import authRoutes from './routes/auth';
import webhookRoutes from './routes/webhook';
import adminRoutes from './routes/admin';

// @ts-expect-error - __STATIC_CONTENT_MANIFEST is injected by wrangler
import manifest from '__STATIC_CONTENT_MANIFEST';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Auth middleware for admin routes (except auth endpoints)
app.use('/api/admin/*', async (c, next) => {
  // Skip auth for login endpoint
  if (c.req.path === '/api/admin/auth/login' || c.req.path === '/api/admin/auth/me') {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const result = await verifyJWT(token, c.env.JWT_SECRET);

  if (!result.valid) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  return next();
});

// Mount routes
app.route('/api/admin/auth', authRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/webhook', webhookRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve static files (Admin UI) using Assets binding
app.get('*', async (c) => {
  // Try to serve static file
  const url = new URL(c.req.url);
  let path = url.pathname;
  
  // Default to index.html for root or paths without extension (SPA routing)
  if (path === '/' || !path.includes('.')) {
    path = '/index.html';
  }

  try {
    // Get the asset from the manifest
    const assetManifest = JSON.parse(manifest);
    const assetKey = path.slice(1); // Remove leading slash
    const mappedKey = assetManifest[assetKey] || assetKey;
    
    // @ts-expect-error - __STATIC_CONTENT is injected by wrangler
    const asset = await c.env.__STATIC_CONTENT.get(mappedKey);
    
    if (asset) {
      // Determine content type
      const contentType = getContentType(path);
      return new Response(asset, {
        headers: { 'Content-Type': contentType },
      });
    }
    
    // Fallback to index.html for SPA routing
    const indexKey = assetManifest['index.html'] || 'index.html';
    // @ts-expect-error - __STATIC_CONTENT is injected by wrangler  
    const indexAsset = await c.env.__STATIC_CONTENT.get(indexKey);
    
    if (indexAsset) {
      return new Response(indexAsset, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    return c.notFound();
  } catch {
    return c.notFound();
  }
});

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
  };
  return types[ext || ''] || 'application/octet-stream';
}

export default app;
