import 'dotenv/config'
import { defineConfig, env } from '@prisma/config'
import { config } from 'dotenv'

config();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // engine: "classic",
  datasource: {
    // url: env('DATABASE_URL'),
    url: "mongodb+srv://adeshinaadam00:q85Mv9LG1j9dN1tC@cluster.mongodb.net/airbnb",
  },
})