import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ClubAvailableDaysController } from './ClubAvailableDays.controller';
import { ClubAvailableDaysValidation } from './ClubAvailableDays.validation';

const router = express.Router();

router.post(
'/',
auth(),
// validateRequest(ClubAvailableDaysValidation.createSchema),
ClubAvailableDaysController.createClubAvailableDays,
);

router.get('/', auth(), ClubAvailableDaysController.getClubAvailableDaysList);

router.get('/:id', auth(), ClubAvailableDaysController.getClubAvailableDaysById);

router.put(
'/:id',
auth(),
// validateRequest(ClubAvailableDaysValidation.updateSchema),
ClubAvailableDaysController.updateClubAvailableDays,
);

router.delete('/:id', auth(), ClubAvailableDaysController.deleteClubAvailableDays);

export const ClubAvailableDaysRoutes = router;