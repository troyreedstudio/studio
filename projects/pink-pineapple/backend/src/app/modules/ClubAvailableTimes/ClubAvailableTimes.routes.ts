import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ClubAvailableTimesController } from './ClubAvailableTimes.controller';
import { ClubAvailableTimesValidation } from './ClubAvailableTimes.validation';

const router = express.Router();

router.post(
'/',
auth(),
// validateRequest(ClubAvailableTimesValidation.createSchema),
ClubAvailableTimesController.createClubAvailableTimes,
);

router.get('/', auth(), ClubAvailableTimesController.getClubAvailableTimesList);

router.get('/:id', auth(), ClubAvailableTimesController.getClubAvailableTimesById);

router.put(
'/:id',
auth(),
// validateRequest(ClubAvailableTimesValidation.updateSchema),
ClubAvailableTimesController.updateClubAvailableTimes,
);

router.delete('/:id', auth(), ClubAvailableTimesController.deleteClubAvailableTimes);

export const ClubAvailableTimesRoutes = router;