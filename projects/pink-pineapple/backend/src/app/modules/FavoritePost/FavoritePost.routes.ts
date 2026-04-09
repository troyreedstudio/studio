import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { FavoritePostController } from './FavoritePost.controller';
import { FavoritePostValidation } from './FavoritePost.validation';

const router = express.Router();

router.post(
'/',
auth(),
// validateRequest(FavoritePostValidation.createSchema),
FavoritePostController.createFavoritePost,
);

router.get('/', auth(), FavoritePostController.getFavoritePostList);

router.get('/:id', auth(), FavoritePostController.getFavoritePostById);

router.put(
'/:id',
auth(),
// validateRequest(FavoritePostValidation.updateSchema),
FavoritePostController.updateFavoritePost,
);

router.delete('/:id', auth(), FavoritePostController.deleteFavoritePost);

export const FavoritePostRoutes = router;