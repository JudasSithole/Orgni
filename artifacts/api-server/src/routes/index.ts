import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import documentsRouter from "./documents";
import modelRouter from "./model";
import keysRouter from "./keys";
import productRouter from "./product";
import { teamsPublicRouter, teamsRouter } from "./teams";
import { authenticate } from "../lib/authenticate";

const router: IRouter = Router();

// Public: health checks, the login endpoint, and the Teams bot messaging
// endpoint (which authenticates inbound Bot Framework JWTs itself).
router.use(healthRouter);
router.use(authRouter);
router.use(teamsPublicRouter);

// Everything below requires an authenticated session. `authenticate` sets
// req.principal (and its tenantId), which the routes read.
router.use(authenticate, documentsRouter);
router.use(authenticate, modelRouter);
router.use(authenticate, keysRouter);
router.use(authenticate, productRouter);
router.use(authenticate, teamsRouter);

export default router;
