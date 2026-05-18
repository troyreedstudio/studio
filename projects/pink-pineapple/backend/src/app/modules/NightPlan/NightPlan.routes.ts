import express from "express";
import auth from "../../middlewares/auth";
import { NightPlanController } from "./NightPlan.controller";

const router = express.Router();

// All endpoints are owner-scoped. Users can only see / mutate their own
// plans — there's no admin inbox for night plans (unlike VIP requests
// which Rowan actively manages).
router.post("/", auth(), NightPlanController.create);
router.get("/mine", auth(), NightPlanController.listMine);
router.get("/:id", auth(), NightPlanController.getById);
router.patch("/:id", auth(), NightPlanController.update);
router.delete("/:id", auth(), NightPlanController.remove);

export const NightPlanRoutes = router;
