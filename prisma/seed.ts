import fs from 'fs';
import path from 'path';
import prisma from './client.js';

const db: any = prisma;

async function ensureDir(p: string) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function copyIfExists(src: string, dst: string) {
  try {
    await fs.promises.copyFile(src, dst);
  } catch (_) {
    // ignore
  }
}

async function main() {
  const projectRoot = path.resolve(process.cwd(), '..');
  const srcImagesDir = path.resolve(projectRoot, 'assets', 'image', 'seed_helper');
  const srcUserImagesDir = path.resolve(projectRoot, 'assets', 'image');
  const uploadsDir = path.resolve(process.cwd(), 'uploads', 'seed');
  await ensureDir(uploadsDir);

  const imagesToCopy = [
    'Santorini.webp',
    'dubai.webp',
    'home.webp',
    'home2.webp',
    'home3 2.jpg',
    'home3.jpg',
    'home3.webp',
    'house.jpeg',
    'house2.webp',
    'house3.webp',
    'house4.webp',
    'room.webp',
    'spain.webp',
  ];

  const hostAvatarFile = 'man.jpeg';
  const hostAvatarUploadPath = `/uploads/seed/${hostAvatarFile}`;


  for (const img of imagesToCopy) {
    await copyIfExists(path.resolve(srcImagesDir, img), path.resolve(uploadsDir, img));
  }

  await copyIfExists(path.resolve(srcUserImagesDir, hostAvatarFile), path.resolve(uploadsDir, hostAvatarFile));

  const hostEmail = 'seed-host@awals.local';
  const host = await db.user.upsert({
    where: { email: hostEmail },
    update: { name: 'Seed Host', phone: '+10000000000', verified: true, picture: hostAvatarUploadPath },
    create: {
      uid: 'seed-host',
      name: 'Seed Host',
      phone: '+10000000000',
      email: hostEmail,
      verified: true,
      role: 'host',
      authChannel: 'email',
      picture: hostAvatarUploadPath,
    },
  });

  const countries = [
    { name: 'Saudi Arabia', code: 'saudi' },
    { name: 'United Arab Emirates', code: 'uae' },
    { name: 'Qatar', code: 'qatar' },
    { name: 'Kuwait', code: 'kuwait' },
    { name: 'Bahrain', code: 'bahrain' },
    { name: 'Oman', code: 'oman' },
  ];

  const categories = ['House', 'Apartment', 'Villa', 'Resort', 'Riad'];
  const serviceCategories = ['Adventure', 'Food', 'Culture', 'Wellness', 'Nature'];

  const now = Date.now();
  const seededNamePrefix = `Seed ${new Date(now).toISOString().slice(0, 10)}`;

  for (const country of countries) {
    for (const category of categories) {
      for (let i = 1; i <= 7; i++) {
        const startIndex = Math.floor(Math.random() * imagesToCopy.length);
        const listingImages = Array.from({ length: 5 }, (_, j) => {
          return `/uploads/seed/${imagesToCopy[(startIndex + j) % imagesToCopy.length]}`;
        }).sort(() => 0.5 - Math.random()); // Shuffle images for variety

        const imagePath = listingImages[0];
        const title = `${seededNamePrefix} ${category} ${i} in ${country.name}`;

        const exists = await db.listing.findFirst({
          where: {
            hostId: host.id,
            country: country.code,
            category,
            name: title,
          },
          select: { id: true },
        });

        if (exists) continue;

        const basePrice = 80 + i * 10;
        const guestCount = Math.floor(Math.random() * 6) + 1; // 1-7 guests

        await db.listing.create({
          data: {
            hostId: host.id,
            name: title,
            description: `Demo listing ${i} for ${country.name} - ${category}. Experience luxury and comfort.`,
            address: `${category} Street ${i}, ${country.name}`,
            lat: 24.7136,
            lng: 46.6753,
            images: listingImages,
            picture: imagePath,
            pricePerNight: String(basePrice),
            weekendPrice: String(basePrice + 20),
            guests: guestCount,
            minNights: (i % 3) + 1, // 1 to 3 nights
            beds: Math.max(1, Math.ceil(guestCount / 2)),
            bedRooms: Math.max(1, Math.ceil(guestCount / 2)),
            bathRooms: Math.max(1, Math.ceil(guestCount / 3)),
            unavailableDates: [],
            amenities: ['Wifi', 'Kitchen', 'Air conditioning'],
            rules: 'No smoking',
            cancellationPolicy: 'Flexible',
            country: country.code,
            category,
            rating: 4.2 + (i % 5) * 0.1,
            deleted: false,
          },
        });
      }
    }
  }

  // Seed ServiceListing (hosting services) for Explore
  for (const country of countries) {
    for (const category of serviceCategories) {
      for (let i = 1; i <= 8; i++) {
        const startIndex = Math.floor(Math.random() * imagesToCopy.length);
        const photos = Array.from({ length: 5 }, (_, j) => {
          return `/uploads/seed/${imagesToCopy[(startIndex + j) % imagesToCopy.length]}`;
        }).sort(() => 0.5 - Math.random());

        const title = `${seededNamePrefix} ${category} Service ${i} in ${country.name}`;

        const exists = await db.serviceListing.findFirst({
          where: {
            hostId: host.id,
            country: country.code,
            category,
            title,
          },
          select: { id: true },
        });

        if (exists) continue;

        await db.serviceListing.create({
          data: {
            hostId: host.id,
            intro: `I am a certified guide for ${category} experiences in ${country.name}.`,
            expertise: `${category} expert with local knowledge.`,
            yearsOfExperience: 2 + (i % 6),
            socialProfiles: ['https://instagram.com/awals', 'https://tiktok.com/@awals'],
            location: `${country.name} Downtown`,
            photos,
            itinerary: [
              { title: 'Meet & Briefing', description: 'Quick intro and safety briefing.', duration: 30, image: photos[0] },
              { title: 'Main Activity', description: 'Enjoy the core experience with guidance.', duration: 90, image: photos[1] },
            ],
            pricing: { maxGuest: 5, pricePerGuest: 35 + i * 2, privateGroupMinimum: 100 },
            details: { isTransporting: i % 2 === 0, transportMethods: i % 2 === 0 ? ['Car'] : [] },
            title,
            description: `Demo service listing ${i} for ${country.name} - ${category}.`,
            country: country.code,
            category,
            status: 'active',
            deleted: false,
          },
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
