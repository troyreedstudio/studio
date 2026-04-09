// Follow.routes: Module file for the Follow.routes functionality.
import express from "express";
import { FollowController } from "./Follow.controller";
import auth from "../../middlewares/auth";


const router = express.Router();

// Send a connection request
router.post("/request", auth(), FollowController.sendConnectionRequest);

// Accept a connection request
router.put("/accept", auth(), FollowController.acceptConnectionRequest);

// Decline a connection request
router.delete("/decline/:requestId", auth(), FollowController.declineConnectionRequest);

// Get the list of friends and the count
router.get("/friends", auth(), FollowController.getFriendList);
router.get("/all-list", auth(), FollowController.getFollowAndFollowing);
router.get("/send-request", auth(), FollowController.getMySendRequest);

// Get the list of pending connection requests and the count
router.get("/requests/pending", auth(), FollowController.getPendingRequestsList);
router.get("/requests/my-request", auth(), FollowController.getMyConnectionRequest);

export const FollowRoutes = router;
