import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import documentsRouter from "./documents";
import modelRouter from "./model";
import keysRouter from "./keys";
import { authenticate } from "../lib/authenticate";

const router: IRouter = Router();

// Public: health checks and the login endpoint.
router.use(healthRouter);
router.use(authRouter);

// Everything below requires an authenticated session. `authenticate` sets
// req.principal (and its tenantId), which the document routes read.
router.use(authenticate, documentsRouter);
router.use(authenticate, modelRouter);
router.use(authenticate, keysRouter);

export default router;
