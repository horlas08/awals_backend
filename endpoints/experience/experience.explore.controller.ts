import type { Request, Response } from 'express';
import prisma from '../../prisma/client.js';
import { response } from '../../utils/req-res.js';

const db: any = prisma;

function parseLimit(v: unknown, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.trunc(n), 50);
}

function normalizeString(v: unknown) {
  const s = (v ?? '').toString().trim();
  return s.length ? s : null;
}

async function getOrCreateDefaultWishlistCategory(userId: string) {
  const name = 'Favorites';
  const existing = await db.wishlistCategory.findFirst({ where: { userId, name } });
  if (existing) return existing;
  return await db.wishlistCategory.create({ data: { userId, name } });
}

async function guestFavoriteThreshold(): Promise<number> {
  const existing = await db.appSettings.findFirst({});
  if (existing && typeof existing.guestFavoriteMinWishlistCount === 'number') {
    return existing.guestFavoriteMinWishlistCount;
  }
  const created = await db.appSettings.create({ data: {} });
  return typeof created.guestFavoriteMinWishlistCount === 'number' ? created.guestFavoriteMinWishlistCount : 5;
}

function withGuestFavorite(listings: any[], threshold: number) {
  return (listings || []).map((l: any) => {
    const count = l?._count?.wishlistedBy ?? 0;
    const isGuestFavorite = Number(count) >= threshold;
    const out = { ...l, isGuestFavorite };
    delete (out as any)._count;
    return out;
  });
}

export async function limitedAllCategory(req: Request, res: Response) {
  try {
    const limit = parseLimit(req.query.limit, 5);

    const threshold = await guestFavoriteThreshold();

    const rawCountries = normalizeString(req.query.countries);
    const defaultCountries = ['saudi', 'uae', 'qatar', 'kuwait', 'bahrain', 'oman'];
    const countries = (rawCountries ? rawCountries.split(',').map((s) => s.trim()).filter(Boolean) : defaultCountries);

    const results = await Promise.all(
      countries.map(async (country) => {
        const listings = await db.experienceListing.findMany({
          where: {
            deleted: false,
            country,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: { _count: { select: { wishlistedBy: true } } },
        });
        return { country, listings: withGuestFavorite(listings, threshold) };
      }),
    );

    return response({ res, code: 200, success: true, msg: 'ok', data: { countries: results } });
  } catch (err: any) {
    return response({ res, code: 500, success: false, msg: err?.message || 'server_error' });
  }
}

export async function listByCategory(req: Request, res: Response) {
  try {
    const category = normalizeString(req.query.category);
    if (!category) return response({ res, code: 400, success: false, msg: 'category is required' });

    const threshold = await guestFavoriteThreshold();

    const rawCountries = normalizeString(req.query.countries);
    const country = normalizeString(req.query.country);
    const defaultCountries = ['saudi', 'uae', 'qatar', 'kuwait', 'bahrain', 'oman'];
    const countries = (rawCountries ? rawCountries.split(',').map((s) => s.trim()).filter(Boolean) : defaultCountries);

    const limit = req.query.limit != null ? parseLimit(req.query.limit, 20) : undefined;

    const where: any = { deleted: false, category };
    if (country) where.country = country;
    else if (countries?.length) where.country = { in: countries };

    const listings = await db.experienceListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { _count: { select: { wishlistedBy: true } } },
    });

    return response({ res, code: 200, success: true, msg: 'ok', data: { category, listings: withGuestFavorite(listings, threshold) } });
  } catch (err: any) {
    return response({ res, code: 500, success: false, msg: err?.message || 'server_error' });
  }
}

export async function listByCountry(req: Request, res: Response) {
  try {
    const country = normalizeString(req.query.country);
    if (!country) return response({ res, code: 400, success: false, msg: 'country is required' });

    const threshold = await guestFavoriteThreshold();

    const limit = req.query.limit != null ? parseLimit(req.query.limit, 50) : undefined;

    const listings = await db.experienceListing.findMany({
      where: { deleted: false, country },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { _count: { select: { wishlistedBy: true } } },
    });

    return response({ res, code: 200, success: true, msg: 'ok', data: { country, listings: withGuestFavorite(listings, threshold) } });
  } catch (err: any) {
    return response({ res, code: 500, success: false, msg: err?.message || 'server_error' });
  }
}

export async function toggleWishlist(req: Request & { user?: any }, res: Response) {
  try {
    const userId = req.user?.id?.toString();
    if (!userId) return response({ res, code: 401, success: false, msg: 'Authorization required' });

    const experienceListingId = (req.params.id ?? '').toString();
    if (!experienceListingId) return response({ res, code: 400, success: false, msg: 'experience listing id is required' });

    const listing = await db.experienceListing.findUnique({ where: { id: experienceListingId } });
    if (!listing || listing.deleted) return response({ res, code: 404, success: false, msg: 'Listing not found' });

    const cat = await getOrCreateDefaultWishlistCategory(userId);

    const existing = await db.wishlistItem.findFirst({
      where: { userId, experienceListingId, categoryId: cat.id },
    });

    if (existing) {
      await db.wishlistItem.delete({ where: { id: existing.id } });
      return response({ res, code: 200, success: true, msg: 'ok', data: { wishlisted: false } });
    }

    await db.wishlistItem.create({
      data: { userId, experienceListingId, categoryId: cat.id },
    });

    return response({ res, code: 200, success: true, msg: 'ok', data: { wishlisted: true } });
  } catch (err: any) {
    return response({ res, code: 500, success: false, msg: err?.message || 'server_error' });
  }
}

export async function getWishlist(req: Request & { user?: any }, res: Response) {
  try {
    const userId = req.user?.id?.toString();
    if (!userId) return response({ res, code: 401, success: false, msg: 'Authorization required' });

    const threshold = await guestFavoriteThreshold();

    const cat = await getOrCreateDefaultWishlistCategory(userId);

    const items = await db.wishlistItem.findMany({
      where: { userId, categoryId: cat.id, experienceListingId: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: { experienceListing: { include: { _count: { select: { wishlistedBy: true } } } } },
    });

    const listings = (items as any[])
      .map((i: any) => i.experienceListing)
      .filter((l: any) => l && l.deleted !== true);

    return response({ res, code: 200, success: true, msg: 'ok', data: { listings: withGuestFavorite(listings, threshold) } });
  } catch (err: any) {
    return response({ res, code: 500, success: false, msg: err?.message || 'server_error' });
  }
}

export async function getWishlistCategories(req: Request & { user?: any }, res: Response) {
  try {
    const userId = req.user?.id?.toString();
    if (!userId) return response({ res, code: 401, success: false, msg: 'Authorization required' });

    if (!db.wishlistCategory?.findMany) {
      return response({
        res,
        code: 500,
        success: false,
        msg: 'Prisma client is out of date (wishlistCategory missing). Run: npx prisma generate (or npm run seed) and restart server.',
      });
    }

    await getOrCreateDefaultWishlistCategory(userId);
    const categories = await db.wishlistCategory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return response({ res, code: 200, success: true, msg: 'ok', data: { categories } });
  } catch (err: any) {
    return response({ res, code: 500, success: false, msg: err?.message || 'server_error' });
  }
}

export async function createWishlistCategory(req: Request & { user?: any }, res: Response) {
  try {
    const userId = req.user?.id?.toString();
    if (!userId) return response({ res, code: 401, success: false, msg: 'Authorization required' });

    const name = normalizeString((req.body as any)?.name);
    if (!name) return response({ res, code: 400, success: false, msg: 'name is required' });

    if (!db.wishlistCategory?.findFirst || !db.wishlistCategory?.create) {
      return response({
        res,
        code: 500,
        success: false,
        msg: 'Prisma client is out of date (wishlistCategory missing). Run: npx prisma generate (or npm run seed) and restart server.',
      });
    }

    const existing = await db.wishlistCategory.findFirst({ where: { userId, name } });
    if (existing) {
      return response({ res, code: 200, success: true, msg: 'ok', data: { category: existing } });
    }

    const created = await db.wishlistCategory.create({ data: { userId, name } });
    return response({ res, code: 201, success: true, msg: 'ok', data: { category: created } });
  } catch (err: any) {
    return response({ res, code: 500, success: false, msg: err?.message || 'server_error' });
  }
}

export async function toggleWishlistInCategory(req: Request & { user?: any }, res: Response) {
  try {
    const userId = req.user?.id?.toString();
    if (!userId) return response({ res, code: 401, success: false, msg: 'Authorization required' });

    const experienceListingId = (req.params.id ?? '').toString();
    if (!experienceListingId) return response({ res, code: 400, success: false, msg: 'experience listing id is required' });

    const categoryId = (req.params.categoryId ?? '').toString();
    if (!categoryId) return response({ res, code: 400, success: false, msg: 'category id is required' });

    const category = await db.wishlistCategory.findFirst({ where: { id: categoryId, userId } });
    if (!category) return response({ res, code: 404, success: false, msg: 'Wishlist category not found' });

    const listing = await db.experienceListing.findUnique({ where: { id: experienceListingId } });
    if (!listing || listing.deleted) return response({ res, code: 404, success: false, msg: 'Listing not found' });

    const existing = await db.wishlistItem.findFirst({
      where: { userId, experienceListingId, categoryId },
    });

    if (existing) {
      return response({ res, code: 200, success: true, msg: 'ok', data: { wishlisted: true } });
    }

    await db.wishlistItem.create({
      data: { userId, experienceListingId, categoryId },
    });

    return response({ res, code: 200, success: true, msg: 'ok', data: { wishlisted: true } });
  } catch (err: any) {
    return response({ res, code: 500, success: false, msg: err?.message || 'server_error' });
  }
}

export async function getWishlistCategoryListings(req: Request & { user?: any }, res: Response) {
  try {
    const userId = req.user?.id?.toString();
    if (!userId) return response({ res, code: 401, success: false, msg: 'Authorization required' });

    const threshold = await guestFavoriteThreshold();

    const categoryId = (req.params.categoryId ?? '').toString();
    if (!categoryId) return response({ res, code: 400, success: false, msg: 'category id is required' });

    const category = await db.wishlistCategory.findFirst({ where: { id: categoryId, userId } });
    if (!category) return response({ res, code: 404, success: false, msg: 'Wishlist category not found' });

    const items = await db.wishlistItem.findMany({
      where: { userId, categoryId, experienceListingId: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: { experienceListing: { include: { _count: { select: { wishlistedBy: true } } } } },
    });

    const listings = (items as any[])
      .map((i: any) => i.experienceListing)
      .filter((l: any) => l && l.deleted !== true);

    return response({ res, code: 200, success: true, msg: 'ok', data: { listings: withGuestFavorite(listings, threshold) } });
  } catch (err: any) {
    return response({ res, code: 500, success: false, msg: err?.message || 'server_error' });
  }
}

export async function getExperienceListingDetails(req: Request, res: Response) {
  try {
    const listingId = (req.params.id ?? '').toString();
    if (!listingId) return response({ res, code: 400, success: false, msg: 'listing id is required' });

    const threshold = await guestFavoriteThreshold();

    const listing = await db.experienceListing.findUnique({
      where: { id: listingId },
      include: { _count: { select: { wishlistedBy: true } } },
    });

    if (!listing || listing.deleted) {
      return response({ res, code: 404, success: false, msg: 'Listing not found' });
    }

    const out = withGuestFavorite([listing], threshold)[0];
    return response({ res, code: 200, success: true, msg: 'ok', data: { listing: out } });
  } catch (err: any) {
    return response({ res, code: 500, success: false, msg: err?.message || 'server_error' });
  }
}
