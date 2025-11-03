class Api::V1::ParticipantsController < ApplicationController
  before_action :require_user!
  before_action :set_ride_from_nested, only: [:create]

  # POST /api/v1/rides/:ride_id/participants
  def create
    return require_ride_access!(@ride) if @ride.protected? && !verify_ride_token(@ride.id)

    name = params[:name].to_s.strip
    role = params[:role].to_s
    seats_offered = params[:seats_offered].to_i
    car_id = params[:car_id]
    if name.blank? || !%w[driver passenger].include?(role)
      return render json: { error: 'Missing required fields' }, status: :bad_request
    end

    # Capacity guard for passengers assigned directly to a car
    if role == 'passenger' && car_id.present?
      car = @ride.cars.find_by(id: car_id)
      return render json: { error: 'CAR_NOT_FOUND' }, status: :not_found unless car
      return render json: { error: 'CAR_FULL' }, status: :unprocessable_entity if car.capacity_left <= 0
    end
    p = @ride.participants.build(name: name, role: role, seats_offered: (role == 'driver' ? seats_offered : 0),
                                 car_id: car_id)
    p.save!
    update_capacities!(@ride, p.car_id)
    render json: { id: p.id }, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: 'VALIDATION_ERROR', details: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  # DELETE /api/v1/participants/:id
  def destroy
    p = Participant.find_by(id: params[:id])
    return render json: { error: 'Not found' }, status: :not_found unless p

    ride = p.ride
    return require_ride_access!(ride) if ride.protected? && !verify_ride_token(ride.id)

    p.destroy!
    update_capacities!(ride, p.car_id)
    render json: { ok: true }
  end

  # PATCH /api/v1/participants/:id
  def update
    p = Participant.find_by(id: params[:id])
    return render json: { error: 'Not found' }, status: :not_found unless p

    ride = p.ride
    return require_ride_access!(ride) if ride.protected? && !verify_ride_token(ride.id)

    old_car_id = p.car_id
    # Capacity guard when assigning to a car
    if params.key?(:car_id)
      new_car_id = params[:car_id]
      if new_car_id.present?
        car = p.ride.cars.find_by(id: new_car_id)
        return render json: { error: 'CAR_NOT_FOUND' }, status: :not_found unless car
        if p.role == 'passenger' && car.capacity_left <= 0
          return render json: { error: 'CAR_FULL' }, status: :unprocessable_entity
        end
      end
    end
    p.update!(participant_update_params)
    update_capacities!(ride, old_car_id)
    update_capacities!(ride, p.car_id)
    render json: { ok: true }
  end

  private

  def set_ride_from_nested
    @ride = Ride.find_by(id: params[:ride_id])
    render json: { error: 'Ride not found' }, status: :not_found unless @ride
  end

  def update_capacities!(ride, car_id)
    # Recompute ride seats_taken and car seats_taken if provided
    if car_id.present? && (car = Car.find_by(id: car_id))
      car.recalc_seats_taken!
    end
    ride.update!(seats_taken: ride.participants.where(role: 'passenger').count)
  end

  def require_ride_access!(_ride)
    render json: { error: 'UNAUTHORIZED' }, status: :unauthorized
  end

  def participant_update_params
    params.permit(:car_id)
  end
end
