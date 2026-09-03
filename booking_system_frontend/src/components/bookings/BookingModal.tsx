import { useState } from 'react';
import type { Flight } from '../../types';
import { Modal, Button } from '../common';
import { Plane, Calendar, Clock, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate, calculateDuration } from '../../utils/formatters';
import { bookFlight, isErrorResponse } from '../../services/api';
import { useUser } from '../../hooks/useUser';
import toast from 'react-hot-toast';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight | null;
  onSuccess: () => void;
}

const SEAT_CLASSES = [
  {
    label: 'Economy',
    value: 'Economy',
    multiplier: 1.0,
    baseStyle: 'border border-green-400 text-green-400',
    activeStyle: 'border border-green-400 text-green-400 bg-green-400/20',
  },
  {
    label: 'Business',
    value: 'Business',
    multiplier: 1.3,
    baseStyle: 'border border-yellow-400 text-yellow-400',
    activeStyle: 'border border-yellow-400 text-yellow-400 bg-yellow-400/20',
  },
  {
    label: 'Galaxium',
    value: 'Galaxium',
    multiplier: 1.5,
    baseStyle: 'border border-transparent text-star-white/70 bg-white/10',
    activeStyle: 'bg-cosmic-gradient text-white border border-transparent',
  },
];

export const BookingModal = ({ isOpen, onClose, flight, onSuccess }: BookingModalProps) => {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [seatClass, setSeatClass] = useState('Economy');

  if (!flight) return null;

  const selectedClassConfig = SEAT_CLASSES.find((c) => c.value === seatClass) ?? SEAT_CLASSES[0];
  const displayPrice = flight.price * selectedClassConfig.multiplier;

  const handleConfirmBooking = async () => {
    if (!user) {
      toast.error('Please sign in to book a flight');
      return;
    }

    setIsLoading(true);

    try {
      const result = await bookFlight({
        user_id: user.user_id,
        name: user.name,
        flight_id: flight.flight_id,
        seat_class: seatClass,
      });

      if (isErrorResponse(result)) {
        toast.error(result.details || result.error);
        return;
      }

      toast.success('Flight booked successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.details || error.error || 'Failed to book flight');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSeatClass('Economy');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Confirm Your Booking"
      size="md"
    >
      <div className="space-y-6">
        {/* Flight Summary */}
        <div className="glass-card p-4 bg-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cosmic-gradient">
              <Plane className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-star-white">
                {flight.origin} → {flight.destination}
              </h3>
              <p className="text-sm text-star-white/60">
                Flight #{flight.flight_id}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Departure */}
            <div className="flex items-start gap-3">
              <Calendar className="text-cosmic-purple mt-1" size={20} />
              <div>
                <p className="text-xs text-star-white/60">Departure</p>
                <p className="text-star-white font-medium">
                  {formatDate(flight.departure_time)}
                </p>
              </div>
            </div>

            {/* Arrival */}
            <div className="flex items-start gap-3">
              <Calendar className="text-cosmic-purple mt-1" size={20} />
              <div>
                <p className="text-xs text-star-white/60">Arrival</p>
                <p className="text-star-white font-medium">
                  {formatDate(flight.arrival_time)}
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-start gap-3">
              <Clock className="text-cosmic-purple mt-1" size={20} />
              <div>
                <p className="text-xs text-star-white/60">Duration</p>
                <p className="text-star-white font-medium">
                  {calculateDuration(flight.departure_time, flight.arrival_time)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Passenger Info */}
        {user && (
          <div className="glass-card p-4 bg-white/5">
            <h4 className="text-sm font-semibold text-star-white mb-2">
              Passenger Information
            </h4>
            <p className="text-star-white">{user.name}</p>
            <p className="text-star-white/60 text-sm">{user.email}</p>
          </div>
        )}

        {/* Seat Class Selector */}
        <div className="glass-card p-4 bg-white/5">
          <h4 className="text-sm font-semibold text-star-white mb-3">Seat Class</h4>
          <div className="flex gap-2">
            {SEAT_CLASSES.map((cls) => (
              <button
                key={cls.value}
                type="button"
                onClick={() => setSeatClass(cls.value)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                  seatClass === cls.value ? cls.activeStyle : cls.baseStyle
                }`}
              >
                {cls.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between p-4 glass-card bg-cosmic-gradient">
          <div className="flex items-center gap-2">
            <DollarSign className="text-white" size={24} />
            <span className="text-white font-semibold">Total Price</span>
          </div>
          <span className="text-2xl font-bold text-white">
            {formatCurrency(displayPrice)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmBooking}
            isLoading={isLoading}
            className="flex-1"
          >
            Confirm Booking
          </Button>
        </div>

        <p className="text-xs text-star-white/60 text-center">
          By confirming, you agree to our terms and conditions
        </p>
      </div>
    </Modal>
  );
};

// Made with Bob
