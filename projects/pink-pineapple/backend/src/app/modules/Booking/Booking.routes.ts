import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { BookingController } from './Booking.controller';
import { BookingValidation } from './Booking.validation';

const router = express.Router();

router.post(
'/',
auth(),
// validateRequest(BookingValidation.createSchema),
BookingController.createBooking,
);

router.get('/', auth(), BookingController.getBookingList);
router.get('/my-booking', auth(), BookingController.getMyBooking);

router.get('/:id', auth(), BookingController.getBookingById);

router.put(
'/update-status',
auth(),
// validateRequest(BookingValidation.updateSchema),
BookingController.updateStatus,
);
router.put(
'/:id',
auth(),
// validateRequest(BookingValidation.updateSchema),
BookingController.updateBooking,
);

router.delete('/:id', auth(), BookingController.deleteBooking);

export const BookingRoutes = router;