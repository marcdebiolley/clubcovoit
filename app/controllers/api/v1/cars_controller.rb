class Api::V1::CarsController < ApplicationController
  before_action :require_user!
  before_action :set_ride, only: [ :index, :create ]
  before_action :set_car, only: [ :update, :destroy, :force_destroy ]

  # GET /api/v1/rides/:ride_id/cars
  def index
    return require_ride_access!(@ride) if @ride.protected? && !verify_ride_token(@ride.id)
    render json: @ride.cars.order(:id)
  end

  # POST /api/v1/rides/:ride_id/cars
  def create
    return require_ride_access!(@ride) if @ride.protected? && !verify_ride_token(@ride.id)
    car = @ride.cars.build(car_params)
    if car.save
      # Optionnel: créer un participant conducteur si driver_name fourni
      if car.driver_name.present?
        @ride.participants.create!(name: car.driver_name, role: "driver", seats_offered: car.seats_total, car_id: car.id)
      end
      recalc_ride!(@ride, car.id)
      render json: { id: car.id }, status: :created
    else
      render json: { error: "VALIDATION_ERROR", details: car.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PATCH /api/v1/cars/:id
  def update
    ride = @car.ride
    return require_ride_access!(ride) if ride.protected? && !verify_ride_token(ride.id)
    if @car.update(car_update_params)
      recalc_ride!(ride, @car.id)
      render json: { ok: true }
    else
      render json: { error: "VALIDATION_ERROR", details: @car.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/cars/:id
  def destroy
    ride = @car.ride
    return require_ride_access!(ride) if ride.protected? && !verify_ride_token(ride.id)

    # SOLUTION SIMPLE : Supprimer directement la voiture
    # Le modèle Car a un callback qui gère automatiquement les participants
    @car.destroy!
    recalc_ride!(ride, nil)
    render json: { ok: true }
  end

  # POST /api/v1/cars/:id/force_destroy - Endpoint de secours
  def force_destroy
    ride = @car.ride
    return require_ride_access!(ride) if ride.protected? && !verify_ride_token(ride.id)

    begin
      # Force la suppression en ignorant les contraintes
      ActiveRecord::Base.transaction do
        # Supprimer tous les participants de cette voiture
        @car.participants.destroy_all
        # Supprimer la voiture
        @car.destroy!
        # Recalculer
        recalc_ride!(ride, nil)
      end
      render json: { ok: true, message: "Voiture supprimée de force" }
    rescue => e
      render json: { error: "FORCE_DELETE_FAILED", message: e.message }, status: :unprocessable_entity
    end
  end

  private

  def set_ride
    @ride = Ride.find_by(id: params[:ride_id])
    render json: { error: "Ride not found" }, status: :not_found unless @ride
  end

  def set_car
    @car = Car.find_by(id: params[:id])
    render json: { error: "Not found" }, status: :not_found unless @car
  end

  def require_ride_access!(ride)
    render json: { error: "UNAUTHORIZED" }, status: :unauthorized
  end

  def car_params
    params.permit(:name, :origin, :departure_time, :seats_total, :driver_name, :pickup_address, :latitude, :longitude)
  end

  def car_update_params
    params.permit(:name, :origin, :departure_time, :seats_total, :driver_name, :pickup_address, :latitude, :longitude)
  end

  def recalc_ride!(ride, car_id)
    ride.update!(seats_taken: ride.participants.where(role: "passenger").count)
    if car_id && (car = Car.find_by(id: car_id))
      car.recalc_seats_taken!
    end
  end
end
