import express, { type Application } from "express";
import cors from "cors";
import AuthRoute from './endpoints/auth/auth.route.js'
import path from 'path';
import ListingRoute from './endpoints/listings/listing.route.js';
import ServiceRoute from './endpoints/service/service.routes.js';
import ExperienceRoute from './endpoints/experience/experience.routes.js';
import UserRoute from './endpoints/user/user.routes.js';
import SupportRoute from './endpoints/support/support.route.js';
import MessagingRoute from './endpoints/messaging/messaging.route.js';
import PaymentRoute from './endpoints/payment/payment.route.js';
import CalendarRoute from './endpoints/calendar/calendar.route.js';
import BookingRoute from './endpoints/booking/booking.route.js';
import AdminRoute from './endpoints/admin/admin.route.js';

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
app.use(`${BASE_ROUTE}/experience`, ExperienceRoute);
app.use(`${BASE_ROUTE}/user`, UserRoute);
app.use(`${BASE_ROUTE}/support`, SupportRoute);
app.use(`${BASE_ROUTE}/messaging`, MessagingRoute);
app.use(`${BASE_ROUTE}/payments`, PaymentRoute);
app.use(`${BASE_ROUTE}/calendar`, CalendarRoute);
app.use(`${BASE_ROUTE}/booking`, BookingRoute);
app.use(`${BASE_ROUTE}/admin`, AdminRoute);
app.get("/", async (_, res) => {

  res.json({ msg: 'Base Route /' })
});

// ### Routes

export default app;