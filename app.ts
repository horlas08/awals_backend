import express, { type Application } from "express";
import cors from "cors";
import AuthRoute from './endpoints/auth/auth.route.js'


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

// ### Middlewares

// ### Routes
const BASE_ROUTE = `/api/v0`;

app.use(
  `${BASE_ROUTE}/auth`, AuthRoute);


app.get("/", async (_, res) => {

  res.json({msg: 'Base Route /'})
});

// ### Routes

export default app;