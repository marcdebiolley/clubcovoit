class Api::V1::RidesController < ApplicationController
  before_action :require_user!
  before_action :set_ride, only: %i[show destroy authenticate]
  before_action :set_ride_for_update, only: [:update]

  # GET /api/v1/rides
  def index
    rides = Ride.order(created_at: :desc).select(:id, :title, :date, :time, :origin, :destination, :seats_total,
                                                 :seats_taken, :note, :invite_code, :created_at)
    render json: rides
  end

  # GET /api/v1/my_upcoming_rides
  def my_upcoming_rides
    # Build a SQL expression for start datetime
    # Prefer a datetime column (start_at) else fallback to date + time
    start_expr = Arel.sql("COALESCE(rides.start_at, to_timestamp(rides.date || ' ' || COALESCE(rides.time,'00:00'), 'YYYY-MM-DD HH24:MI'))")

    q = Ride
        .where(start_expr.gteq(Time.current))
        .where(
          'rides.user_id = :uid OR EXISTS (SELECT 1 FROM participants p WHERE p.ride_id = rides.id AND p.user_id = :uid)',
          uid: current_user.id
        )
        .order(Arel.sql('COALESCE(rides.start_at, rides.date, rides.created_at) ASC'))
        .limit(50)

    render json: q.select(:id, :title, :origin, :destination, :date, :time, :start_at)
  end

  # PATCH /api/v1/rides/:id
  def update
    # Only creator can update (simple rule for now)
    return render json: { error: 'FORBIDDEN' }, status: :forbidden if @ride.user_id != current_user.id

    if @ride.update(ride_params)
      render json: { ok: true, ride: @ride }
    else
      render json: { error: 'VALIDATION_ERROR', details: @ride.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # POST /api/v1/rides
  def create
    ride = current_user.rides.build(ride_params)
    ride.seats_taken ||= 0
    ride.set_password(params[:password].to_s) if params[:password].present?
    if ride.save
      render json: { id: ride.id, invite_code: ride.invite_code }, status: :created
    else
      render json: { error: 'VALIDATION_ERROR', details: ride.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # GET /api/v1/rides/resolve?code=...
  def resolve
    code = params[:code].to_s
    return render json: { error: 'Missing code' }, status: :bad_request if code.blank?

    ride = Ride.find_by(invite_code: code)
    return render json: { error: 'Not found' }, status: :not_found unless ride

    render json: { id: ride.id, protected: ride.protected? }
  end

  # POST /api/v1/rides/:id/auth
  def authenticate
    return render json: { error: 'Ride not found' }, status: :not_found unless @ride
    return render json: { token: nil } unless @ride.protected?

    password = params[:password].to_s
    return render json: { error: 'INVALID_PASSWORD' }, status: :unauthorized unless @ride.verify_password(password)

    token = sign_ride_token(@ride.id)
    render json: { token: token }
  end

  # GET /api/v1/rides/:id
  def show
    return require_ride_access!(@ride) if @ride.protected? && !verify_ride_token(@ride.id)

    drivers = @ride.participants.where(role: 'driver').order(:id)
    passengers = @ride.participants.where(role: 'passenger').order(:id)
    cars = @ride.cars.order(:id)
    waiting_list = passengers.select { |p| p.car_id.nil? }
    render json: {
      ride: @ride,
      drivers: drivers,
      passengers: passengers,
      cars: cars,
      waiting_list: waiting_list
    }
  end

  # DELETE /api/v1/rides/:id
  def destroy
    return require_ride_access!(@ride) if @ride.protected? && !verify_ride_token(@ride.id)

    @ride.destroy!
    render json: { ok: true }
  end

  private

  def set_ride
    @ride = Ride.find_by(id: params[:id])
  end

  def set_ride_for_update
    @ride = Ride.find_by(id: params[:id])
    render json: { error: 'Not found' }, status: :not_found unless @ride
  end

  def require_ride_access!(_ride)
    render json: { error: 'UNAUTHORIZED' }, status: :unauthorized
  end

  def ride_params
    params.permit(:title, :date, :time, :origin, :destination, :seats_total, :note, :group_id)
  end
end
