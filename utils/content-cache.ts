/**
 * OTA Content Caching Layer
 * 
 * Provides smart caching for game content with:
 * - Version-based cache invalidation
 * - Delta sync for bandwidth optimization
 * - Offline fallback support
 */

import { storage } from './storage';

// Cache keys
const CACHE_PREFIX = 'ota_content_';
const VERSION_PREFIX = 'ota_version_';

// Cache TTL (24 hours)
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  version: number;
  checksum: string;
  cachedAt: number;
}

interface ContentVersion {
  version: number;
  checksum: string;
}

/**
 * Get cached content for a game
 */
export async function getCachedContent<T>(gameId: string): Promise<CacheEntry<T> | null> {
  try {
    const key = `${CACHE_PREFIX}${gameId}`;
    const cached = storage.getString(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    
    // Check if cache is still valid (within TTL)
    if (Date.now() - entry.cachedAt > CACHE_TTL) {
      // Cache expired, but still return it as fallback
      console.log(`[ContentCache] Cache for ${gameId} expired, will refresh`);
    }
    
    return entry;
  } catch (error) {
    console.error('[ContentCache] Error reading cache:', error);
    return null;
  }
}

/**
 * Set cached content for a game
 */
export async function setCachedContent<T>(
  gameId: string,
  data: T,
  version: number,
  checksum: string
): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${gameId}`;
    const entry: CacheEntry<T> = {
      data,
      version,
      checksum,
      cachedAt: Date.now(),
    };
    storage.set(key, JSON.stringify(entry));
    console.log(`[ContentCache] Cached ${gameId} v${version}`);
  } catch (error) {
    console.error('[ContentCache] Error writing cache:', error);
  }
}

/**
 * Check if cache needs refresh
 */
export async function needsCacheRefresh(
  gameId: string,
  serverVersion: ContentVersion
): Promise<boolean> {
  const cached = await getCachedContent(gameId);
  
  if (!cached) return true;
  
  // Check version mismatch
  if (cached.version < serverVersion.version) return true;
  
  // Check checksum mismatch
  if (cached.checksum !== serverVersion.checksum) return true;
  
  // Check TTL
  if (Date.now() - cached.cachedAt > CACHE_TTL) return true;
  
  return false;
}

/**
 * Clear all content cache
 */
export async function clearContentCache(): Promise<void> {
  try {
    const keys = storage.getAllKeys();
    const cacheKeys = keys.filter(k => 
      k.startsWith(CACHE_PREFIX) || k.startsWith(VERSION_PREFIX)
    );
    
    cacheKeys.forEach(key => storage.delete(key));
    console.log('[ContentCache] Cache cleared');
  } catch (error) {
    console.error('[ContentCache] Error clearing cache:', error);
  }
}

/**
 * Clear cache for a specific game
 */
export async function clearGameCache(gameId: string): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${gameId}`;
    storage.delete(key);
    console.log(`[ContentCache] Cache cleared for ${gameId}`);
  } catch (error) {
    console.error('[ContentCache] Error clearing game cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  games: string[];
  totalSize: number;
}> {
  try {
    const keys = storage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    
    let totalSize = 0;
    const games: string[] = [];
    
    for (const key of cacheKeys) {
      const value = storage.getString(key);
      if (value) {
        totalSize += value.length;
        games.push(key.replace(CACHE_PREFIX, ''));
      }
    }
    
    return {
      totalEntries: cacheKeys.length,
      games,
      totalSize,
    };
  } catch (error) {
    console.error('[ContentCache] Error getting stats:', error);
    return { totalEntries: 0, games: [], totalSize: 0 };
  }
}

/**
 * Merge delta content with existing cache
 */
export async function mergeDeltaContent<T extends { _id: string }>(
  gameId: string,
  deltaContent: T[],
  newVersion: number,
  newChecksum: string
): Promise<T[]> {
  const cached = await getCachedContent<T[]>(gameId);
  
  if (!cached) {
    // No existing cache, just use delta as full content
    await setCachedContent(gameId, deltaContent, newVersion, newChecksum);
    return deltaContent;
  }
  
  // Merge: replace existing items, add new ones
  const existingMap = new Map(cached.data.map(item => [item._id, item]));
  
  for (const item of deltaContent) {
    existingMap.set(item._id, item);
  }
  
  const merged = Array.from(existingMap.values());
  await setCachedContent(gameId, merged, newVersion, newChecksum);
  
  return merged;
}
