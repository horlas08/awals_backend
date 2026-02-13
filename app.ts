import express, { type Application } from "express";
import cors from "cors";
import AuthRoute from './endpoints/auth/auth.route.js'
import path from 'path';
import ListingRoute from './endpoints/listings/listing.route.js';
import ServiceRoute from './endpoints/service/service.routes.js';

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    // origin: CLIENT_URL,
    origin: '*',
    credentials: true,
  })
);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ### Middlewares

// ### Routes
const BASE_ROUTE = `/api/v0`;

app.use(
  `${BASE_ROUTE}/auth`, AuthRoute);

app.use(`${BASE_ROUTE}/listings`, ListingRoute);
app.use(`${BASE_ROUTE}/service`, ServiceRoute);
app.get("/", async (_, res) => {

  res.json({ msg: 'Base Route /' })
});

// ### Routes

export default app;