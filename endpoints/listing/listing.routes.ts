
import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import { ListingController } from "./listing.controller.js";

const router = Router();

router.post("/create", verifyToken, ListingController.createListing);
router.get("/", ListingController.getAllListings);
router.get("/all/search", ListingController.searchListings);
router.get("/:id", ListingController.getListingById);
router.patch("/:id/update", verifyToken, ListingController.updateListing);
router.delete("/:id/delete", verifyToken, ListingController.deleteListing);

export default router;
