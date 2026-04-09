import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { BlockUserController } from './BlockUser.controller';
import { BlockUserValidation } from './BlockUser.validation';

const router = express.Router();

router.post(
'/',
auth(),
// validateRequest(BlockUserValidation.createSchema),
BlockUserController.createBlockUser,
);

router.get('/', auth(), BlockUserController.getBlockUserList);

router.get('/:id', auth(), BlockUserController.getBlockUserById);

router.put(
'/:id',
auth(),
// validateRequest(BlockUserValidation.updateSchema),
BlockUserController.updateBlockUser,
);

router.delete('/:id', auth(), BlockUserController.deleteBlockUser);

export const BlockUserRoutes = router;