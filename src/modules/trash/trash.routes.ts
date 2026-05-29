import { Router } from "express";
import { TrashController } from "./trash.controller.js";

const router: Router = Router();

router.get("/", TrashController.getTrash);
router.post("/restore/:id", TrashController.restoreItem);
router.delete("/:id", TrashController.permanentDelete);

export const TrashRoutes: Router = router;
