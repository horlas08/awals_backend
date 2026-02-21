import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(process.cwd(), '.env') });
import prisma from './client.js';

const db: any = prisma;

function maskMongoUrl(u?: string) {
  if (!u) return '(missing)';
  try {
    const url = new URL(u);
    const auth = url.username || url.password ? '***:***@' : '';
    return `${url.protocol}//${auth}${url.host}${url.pathname}`;
  } catch {
    return '(invalid)';
  }
}

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
  console.log('[seed] start');
  console.log('[seed] DATABASE_URL =', maskMongoUrl(process.env.DATABASE_URL));
  console.time('[seed] total');

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

  console.log('[seed] seeding Listing...');
  let listingCreated = 0;

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

        if (exists) {
          if (listingCreated === 0 && i === 1 && category === categories[0] && country.code === countries[0]?.code) {
            console.log('[seed] example existing Listing found, skipping all for this category/country');
          }
          continue;
        }

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

        listingCreated++;
        if (listingCreated % 20 === 0) console.log(`[seed] Listing created: ${listingCreated}`);
      }
    }
  }

  console.log(`[seed] Listing done. created=${listingCreated}`);

  // Seed ServiceListing (hosting services) for Explore
  const srcServiceImagesDir = path.resolve(projectRoot, 'assets', 'image', 'services');
  const serviceImagesToCopy = [
    "imgi_138_4fa7aebd-1c2c-48b9-b157-669b2f3c3c64.png",
    "imgi_140_eda45979-c484-4c57-8a29-06145e13ad26.png",
    "imgi_145_213d9438-6779-4c45-8557-44333be09ce4.png",
    "imgi_146_08abf0ef-646a-437f-86c6-c54bf3c0c3cd.png",
    "imgi_147_7e9d5485-961b-4939-9bbe-3d0a81052cca.png",
    "imgi_148_8277af35-dbef-4d32-a44c-90cda4b23dbb.png",
    "imgi_207_0ac86f0e-c39b-428d-9759-69c04e59d91c.png",
    "imgi_37_ad09dab3-23e8-45a0-b28a-0b2bd914f75d.png",
    "imgi_40_31485fdd-f2e4-47d2-86fe-da731cf1a9ec.png"
  ];

  for (const img of serviceImagesToCopy) {
    await copyIfExists(path.resolve(srcServiceImagesDir, img), path.resolve(uploadsDir, img));
  }

  console.log('[seed] seeding ServiceListing...');
  let serviceCreated = 0;

  for (const country of countries) {
    for (const category of serviceCategories) {
      for (let i = 1; i <= 8; i++) {
        const startIndex = Math.floor(Math.random() * serviceImagesToCopy.length);
        const photos = Array.from({ length: 5 }, (_, j) => {
          return `/uploads/seed/${serviceImagesToCopy[(startIndex + j) % serviceImagesToCopy.length]}`;
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
            title,
            description: `Demo service listing ${i} for ${country.name} - ${category}.`,
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
            country: country.code,
            category,
            status: 'active',
            deleted: false,
          },
        });
      }
    }
  }

  // Seed ExperienceListing (same model as ServiceListing, but kind=experience)
  const srcExperienceImagesDir = path.resolve(projectRoot, 'assets', 'image', 'experience');
  const experienceImagesToCopy = [
    'imgi_164_a32adab1-f9df-47e1-a411-bdff91b579c3.png',
    'imgi_165_1e24b1c9-b070-48d9-8a70-91aae3151830.png',
    'imgi_166_3d67e9a9-520a-49ee-b439-7b3a75ea814d.png',
    'imgi_172_31485fdd-f2e4-47d2-86fe-da731cf1a9ec.png',
    'imgi_200_213d9438-6779-4c45-8557-44333be09ce4.png',
    'imgi_232_ad09dab3-23e8-45a0-b28a-0b2bd914f75d.png',
    'imgi_308_4fa7aebd-1c2c-48b9-b157-669b2f3c3c64.png',
    'imgi_310_eda45979-c484-4c57-8a29-06145e13ad26.png',
    'imgi_314_08abf0ef-646a-437f-86c6-c54bf3c0c3cd.png',
    'imgi_315_7e9d5485-961b-4939-9bbe-3d0a81052cca.png',
    'imgi_316_8277af35-dbef-4d32-a44c-90cda4b23dbb.png',
    'imgi_33_213d9438-6779-4c45-8557-44333be09ce4.png',
    'imgi_361_0ac86f0e-c39b-428d-9759-69c04e59d91c.png',
    'imgi_3_1558ce63-e364-4bdc-815d-d2b7cd818fdd.png',
    'imgi_56_31485fdd-f2e4-47d2-86fe-da731cf1a9ec.png',
    'imgi_7_31485fdd-f2e4-47d2-86fe-da731cf1a9ec.png',
    'imgi_81_213d9438-6779-4c45-8557-44333be09ce4.png',
  ];

  for (const img of experienceImagesToCopy) {
    await copyIfExists(path.resolve(srcExperienceImagesDir, img), path.resolve(uploadsDir, img));
  }

  console.log('[seed] seeding ExperienceListing...');
  let experienceCreated = 0;

  for (const country of countries) {
    for (const category of serviceCategories) {
      for (let i = 1; i <= 8; i++) {
        const startIndex = Math.floor(Math.random() * experienceImagesToCopy.length);
        const photos = Array.from({ length: 5 }, (_, j) => {
          return `/uploads/seed/${experienceImagesToCopy[(startIndex + j) % experienceImagesToCopy.length]}`;
        }).sort(() => 0.5 - Math.random());

        const title = `${seededNamePrefix} ${category} Experience ${i} in ${country.name}`;

        const exists = await db.experienceListing.findFirst({
          where: {
            hostId: host.id,
            country: country.code,
            category,
            title,
          },
          select: { id: true },
        });
        if (exists) continue;

        await db.experienceListing.create({
          data: {
            hostId: host.id,
            title,
            description: `Demo experience listing ${i} for ${country.name} - ${category}.`,
            intro: `I am a certified host for ${category} experiences in ${country.name}.`,
            expertise: `${category} experience host with local knowledge.`,
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
            country: country.code,
            category,
            status: 'active',
            deleted: false,
          },
        });

        experienceCreated++;
        if (experienceCreated % 25 === 0) console.log(`[seed] ExperienceListing created: ${experienceCreated}`);
      }
    }
  }

  console.log(`[seed] ExperienceListing done. created=${experienceCreated}`);
  console.timeEnd('[seed] total');
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
