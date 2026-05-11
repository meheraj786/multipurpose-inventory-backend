import { Router } from "express";
import { ActivityLogController } from "./activityLog.controller.js";

const router: Router = Router();
router.get("/", ActivityLogController.getLogs);
export const ActivityLogRoutes: Router = router;
