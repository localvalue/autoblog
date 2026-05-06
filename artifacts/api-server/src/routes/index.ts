import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import keywordsRouter from "./keywords";
import contentPlansRouter from "./content_plans";
import articlesRouter from "./articles";
import analyticsRouter from "./analytics";
import wordpressRouter from "./wordpress";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(keywordsRouter);
router.use(contentPlansRouter);
router.use(articlesRouter);
router.use(analyticsRouter);
router.use("/projects", wordpressRouter);

export default router;
