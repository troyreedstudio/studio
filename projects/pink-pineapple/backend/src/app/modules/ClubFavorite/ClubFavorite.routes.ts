import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ClubFavoriteController } from './ClubFavorite.controller';
import { ClubFavoriteValidation } from './ClubFavorite.validation';

const router = express.Router();

router.post(
'/',
auth(),
// validateRequest(ClubFavoriteValidation.createSchema),
ClubFavoriteController.createClubFavorite,
);

router.get('/', auth(), ClubFavoriteController.getClubFavoriteList);

router.get('/:id', auth(), ClubFavoriteController.getClubFavoriteById);

router.put(
'/:id',
auth(),
// validateRequest(ClubFavoriteValidation.updateSchema),
ClubFavoriteController.updateClubFavorite,
);

router.delete('/:id', auth(), ClubFavoriteController.deleteClubFavorite);

export const ClubFavoriteRoutes = router;