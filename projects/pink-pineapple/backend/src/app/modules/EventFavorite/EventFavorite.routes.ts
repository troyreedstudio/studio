import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { EventFavoriteController } from './EventFavorite.controller';
import { EventFavoriteValidation } from './EventFavorite.validation';

const router = express.Router();

router.post(
'/',
auth(),
// validateRequest(EventFavoriteValidation.createSchema),
EventFavoriteController.createEventFavorite,
);

router.get('/', auth(), EventFavoriteController.getEventFavoriteList);

router.get('/:id', auth(), EventFavoriteController.getEventFavoriteById);

router.put(
'/:id',
auth(),
// validateRequest(EventFavoriteValidation.updateSchema),
EventFavoriteController.updateEventFavorite,
);

router.delete('/:id', auth(), EventFavoriteController.deleteEventFavorite);

export const EventFavoriteRoutes = router;