import express from "express";
import { userRoutes } from "../modules/User/user.route";
import { AuthRoutes } from "../modules/Auth/auth.routes";
import { AvailableDaysRoutes } from "../modules/AvailableDays/AvailableDays.routes";
import { ClubAvailableDaysRoutes } from "../modules/ClubAvailableDays/ClubAvailableDays.routes";
import { AvailableTimeRoutes } from "../modules/AvailableTime/AvailableTime.routes";
import { ClubAvailableTimesRoutes } from "../modules/ClubAvailableTimes/ClubAvailableTimes.routes";
import { EventsRoutes } from "../modules/Events/Events.routes";
import { ClubFavoriteRoutes } from "../modules/ClubFavorite/ClubFavorite.routes";
import { EventFavoriteRoutes } from "../modules/EventFavorite/EventFavorite.routes";
import { BookingRoutes } from "../modules/Booking/Booking.routes";
import { FavoritePostRoutes } from "../modules/FavoritePost/FavoritePost.routes";
import { PostRouter } from "../modules/Post/post.route";
import { LikeRouter } from "../modules/Like/like.routes";
import { CommentRoutes } from "../modules/Comment/Comment.routes";
import { FollowRoutes } from "../modules/Follow/Follow.routes";
import { BlockUserRoutes } from "../modules/BlockUser/BlockUser.routes";



const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/availableDays",
    route: AvailableDaysRoutes,
  },
  {
    path: "/clubs-available",
    route: ClubAvailableDaysRoutes,
  },
  {
    path: "/available-time",
    route: AvailableTimeRoutes,
  },
  {
    path: "/club-available-time",
    route: ClubAvailableTimesRoutes,
  },
  {
    path: "/events",
    route: EventsRoutes,
  },
  {
    path: "/club-favorite",
    route: ClubFavoriteRoutes,
  },
  {
    path: "/event-favorite",
    route: EventFavoriteRoutes,
  },
  {
    path: "/booking",
    route: BookingRoutes,
  },
  {
    path: "/post-favorite",
    route: FavoritePostRoutes,
  },
  {
    path: "/post",
    route: PostRouter,
  },
  {
    path: "/like",
    route: LikeRouter,
  },
  {
    path: "/comments",
    route: CommentRoutes,
  },
  {
    path: "/follow",
    route: FollowRoutes,
  },
  {
    path: "/block",
    route: BlockUserRoutes,
  },


];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
