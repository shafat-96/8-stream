import express from "express";
import mediaInfo from "../controllers/mediaInfo";
import getStream from "../controllers/getStream";
import { createProxyMiddleware } from "http-proxy-middleware";
import getSeasonList from "../controllers/getSeasonList";
import getM3u8 from "../controllers/getM3u8";

const router = express.Router();

router.get("/mediaInfo", mediaInfo);
router.post("/getStream", getStream);
router.get("/getSeasonList", getSeasonList);
router.get("/getM3u8", getM3u8);

export default router;
