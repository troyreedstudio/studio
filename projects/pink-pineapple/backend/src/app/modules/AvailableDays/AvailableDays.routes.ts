import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AvailableDaysController } from './AvailableDays.controller';
import { AvailableDaysValidation } from './AvailableDays.validation';

const router = express.Router();

router.post(
'/',
auth(),
// validateRequest(AvailableDaysValidation.createSchema),
AvailableDaysController.createAvailableDays,
);

router.get('/', AvailableDaysController.getAvailableDaysList);

router.get('/:id', AvailableDaysController.getAvailableDaysById);

router.put(
'/:id',
auth(),
// validateRequest(AvailableDaysValidation.updateSchema),
AvailableDaysController.updateAvailableDays,
);

router.delete('/:id', auth(), AvailableDaysController.deleteAvailableDays);

export const AvailableDaysRoutes = router;