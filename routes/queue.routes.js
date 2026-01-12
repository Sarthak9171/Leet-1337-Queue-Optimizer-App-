const express = require("express");
const router = express.Router();

const {
  createQueue,
  getQueues,
  getQueueById,
  joinQueue,
  serveNext,
  getTokenStatus,
} = require("../controllers/queue.controller");

const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");


router.post(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN"),
  createQueue
);


router.get(
  "/",
  authMiddleware,
  getQueues
);

router.post("/join", joinQueue);

router.get(
  "/:queueId",
  authMiddleware,
  getQueueById
);

router.patch(
  "/:queueId/serve-next",
  serveNext
);




router.get(
  "/:queueId/token/:tokenNumber/status",
  getTokenStatus
);


module.exports = router;
