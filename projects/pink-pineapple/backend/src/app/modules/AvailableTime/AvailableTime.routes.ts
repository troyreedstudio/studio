import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AvailableTimeController } from './AvailableTime.controller';
import { AvailableTimeValidation } from './AvailableTime.validation';

const router = express.Router();

router.post(
'/',
auth(),
// validateRequest(AvailableTimeValidation.createSchema),
AvailableTimeController.createAvailableTime,
);

router.get('/', AvailableTimeController.getAvailableTimeList);

router.get('/:id', AvailableTimeController.getAvailableTimeById);

router.put(
'/:id',
auth(),
// validateRequest(AvailableTimeValidation.updateSchema),
AvailableTimeController.updateAvailableTime,
);

router.delete('/:id', auth(), AvailableTimeController.deleteAvailableTime);

export const AvailableTimeRoutes = router;