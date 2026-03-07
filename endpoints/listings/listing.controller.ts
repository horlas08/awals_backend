import type { Request, Response } from 'express';
import prisma from '../../prisma/client.js';

const db: any = prisma;

function mapPayloadToListingData(payload: any) {
  const data: any = {};
  if (payload.title !== undefined) data.name = payload.title;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.images && Array.isArray(payload.images)) data.images = payload.images;
  if (payload.weekdayPrice !== undefined) data.pricePerNight = String(payload.weekdayPrice);
  if (payload.weekendPrice !== undefined) data.weekendPrice = String(payload.weekendPrice);

  // Handle status updates
  if (payload.status !== undefined) {
    const validStatuses = ['pending', 'action_required', 'completed', 'in_review', 'active', 'inactive'];
    if (validStatuses.includes(payload.status)) {
      data.status = payload.status;
    }
  }

  if (payload.location) {
    const addrParts = [];
    if (payload.location.street) addrParts.push(payload.location.street);
    if (payload.location.city) addrParts.push(payload.location.city);
    if (payload.location.state) addrParts.push(payload.location.state);

    data.address = addrParts.join(', ');
    if (payload.location.country) data.country = payload.location.country;
    if (payload.location.lat !== undefined) data.lat = Number(payload.location.lat);
    if (payload.location.lng !== undefined) data.lng = Number(payload.location.lng);
  }

  if (payload.basic) {
    if (payload.basic.guests !== undefined) data.guests = payload.basic.guests;
    if (payload.basic.bedrooms !== undefined) data.bedRooms = payload.basic.bedrooms;
    if (payload.basic.beds !== undefined) data.beds = payload.basic.beds;
    if (payload.basic.bathrooms !== undefined) data.bathRooms = payload.basic.bathrooms;
  }
  if (payload.discounts !== undefined) data.discounts = payload.discounts;
  return data;
}

export const createDraft = async (req: Request & { user?: any }, res: Response) => {
  try {
    const hostId = req.user?.id?.toString();
    if (!hostId) return res.status(401).json({ message: 'Authorization required' });

    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const mappedFields = mapPayloadToListingData(payload);

    const draft = await db.listing.create({
      data: {
        hostId,
        status: 'pending',
        name: mappedFields.name || 'Untitled Listing',
        ...mappedFields,
        draftData: { ...payload, status: 'PENDING' },
      }
    });

    return res.status(201).json({ id: draft.id, status: draft.status });
  } catch (error: any) {
    console.error('Error creating draft:', error);
    return res.status(500).json({ message: error.message });
  }
};

export const listDrafts = async (req: Request & { user?: any }, res: Response) => {
  try {
    const hostId = req.user?.id?.toString();
    if (!hostId) return res.status(401).json({ message: 'Authorization required' });

    const drafts = await db.listing.findMany({
      where: { hostId, status: 'pending', deleted: false },
      orderBy: { createdAt: 'desc' }
    });

    const all = drafts.map((draft: any) => ({
      id: draft.id,
      status: draft.status,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      data: draft.draftData || {}
    }));

    return res.json(all);
  } catch (error: any) {
    console.error('Error listing drafts:', error);
    return res.status(500).json({ message: error.message });
  }
};

export const updateDraft = async (req: Request & { user?: any }, res: Response) => {
  try {
    const hostId = req.user?.id?.toString();
    if (!hostId) return res.status(401).json({ message: 'Authorization required' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id required' });

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing || existing.deleted || existing.hostId !== hostId) {
      return res.status(404).json({ message: 'Draft not found' });
    }

    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const newData = { ...(existing.draftData || {}), ...payload };
    const mappedFields = mapPayloadToListingData(payload);

    await db.listing.update({
      where: { id },
      data: {
        name: mappedFields.name || existing.name || 'Untitled Listing',
        ...mappedFields,
        draftData: newData
      }
    });

    return res.json({ ok: true });
  } catch (error: any) {
    console.error('Error updating draft:', error);
    return res.status(500).json({ message: error.message });
  }
};

export const getDraft = async (req: Request & { user?: any }, res: Response) => {
  try {
    const hostId = req.user?.id?.toString();
    if (!hostId) return res.status(401).json({ message: 'Authorization required' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id required' });

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing || existing.deleted || existing.hostId !== hostId) {
      return res.status(404).json({ message: 'Draft not found' });
    }

    return res.json({
      id: existing.id,
      status: existing.status,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
      data: existing.draftData || {}
    });
  } catch (error: any) {
    console.error('Error getting draft:', error);
    return res.status(500).json({ message: error.message });
  }
};

export const finalizeDraft = async (req: Request & { user?: any }, res: Response) => {
  try {
    const hostId = req.user?.id?.toString();
    if (!hostId) return res.status(401).json({ message: 'Authorization required' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id required' });

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing || existing.deleted || existing.hostId !== hostId) {
      return res.status(404).json({ message: 'Draft not found' });
    }

    const draftData = existing.draftData as any || {};

    // Check if residential address is complete
    const isResidentialComplete =
      draftData.residentialCountry &&
      draftData.residentialStreet &&
      draftData.residentialCity;

    const newStatus = isResidentialComplete ? 'in_review' : 'action_required';
    const newData = { ...draftData, status: newStatus.toUpperCase() };

    // Update the Listing status
    await db.listing.update({
      where: { id },
      data: { status: newStatus, draftData: newData }
    });

    // If residential address is provided, save it to the Host's User profile
    if (isResidentialComplete) {
      await db.user.update({
        where: { id: hostId },
        data: {
          residentialCountry: draftData.residentialCountry,
          residentialStreet: draftData.residentialStreet,
          residentialCity: draftData.residentialCity,
          residentialState: draftData.residentialState || null,
          residentialPostalCode: draftData.residentialPostalCode || null,
          residentialApartment: draftData.residentialApartment || null
        }
      });
    }

    return res.json({ status: newStatus.toUpperCase() });
  } catch (error: any) {
    console.error('Error finalizing draft:', error);
    return res.status(500).json({ message: error.message });
  }
};

export const attachImagePath = async (req: Request & { user?: any }, res: Response) => {
  try {
    const hostId = req.user?.id?.toString();
    if (!hostId) return res.status(401).json({ message: 'Authorization required' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id required' });

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing || existing.deleted || existing.hostId !== hostId) {
      return res.status(404).json({ message: 'Draft not found' });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const publicPath = `/uploads/${file.filename}`;
    const images = Array.isArray(existing.images) ? [...existing.images] : [];
    images.push(publicPath);

    const newData = { ...(existing.draftData || {}) };
    const draftImages = Array.isArray(newData.images) ? [...newData.images] : [];
    draftImages.push(publicPath);
    newData.images = draftImages;

    await db.listing.update({
      where: { id },
      data: { images, draftData: newData },
    });

    return res.json({ ok: true, images: draftImages });
  } catch (error: any) {
    console.error('Error attaching image path:', error);
    return res.status(500).json({ message: error.message });
  }
};

export const updateAllActionRequiredToInReview = async (req: Request & { user?: any }, res: Response) => {
  try {
    const hostId = req.user?.id?.toString();
    if (!hostId) return res.status(401).json({ message: 'Authorization required' });

    // Update all listings for this host with status action_required to unverify
    const result = await db.listing.updateMany({
      where: {
        hostId,
        status: 'action_required',
        deleted: false,
      },
      data: {
        status: 'in_review',
      },
    });

    return res.json({ success: true, updatedCount: result.count });
  } catch (error: any) {
    console.error('Error updating action_required listings:', error);
    return res.status(500).json({ message: error.message });
  }
};

export const deleteDraft = async (req: Request & { user?: any }, res: Response) => {
  try {
    const hostId = req.user?.id?.toString();
    if (!hostId) return res.status(401).json({ message: 'Authorization required' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'id required' });

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing || existing.deleted || existing.hostId !== hostId) {
      return res.status(404).json({ message: 'Draft not found' });
    }

    await db.listing.update({
      where: { id },
      data: { deleted: true }
    });

    return res.json({ ok: true });
  } catch (error: any) {
    console.error('Error deleting draft:', error);
    return res.status(500).json({ message: error.message });
  }
};
