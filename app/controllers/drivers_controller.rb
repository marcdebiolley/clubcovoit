class DriversController < ActionController::Base
  protect_from_forgery with: :exception

  before_action :set_group
  before_action :set_ride
  before_action :set_car, only: [:destroy]

  # POST /clubs/:share_token/events/:event_id/drivers
  def create
    car = @ride.cars.build(driver_params)
    car.seats_total ||= 4
    car.seats_taken ||= 0
    if car.save
      redirect_to "/ride.html?id=#{@ride.id}", notice: 'Vous êtes inscrit comme conducteur.'
    else
      redirect_to "/ride.html?id=#{@ride.id}", alert: 'Impossible de créer la voiture.'
    end
  end

  # DELETE /clubs/:share_token/events/:event_id/drivers/:id
  def destroy
    @car.destroy!
    redirect_to "/ride.html?id=#{@ride.id}", notice: 'Conducteur retiré.'
  end

  private

  def set_group
    @group = Group.find_by(invite_code: params[:club_share_token] || params[:share_token])
    render plain: 'Club introuvable', status: :not_found and return unless @group
  end

  def set_ride
    @ride = Ride.find_by(id: params[:event_id] || params[:event], group_id: @group.id)
    render plain: 'Événement introuvable', status: :not_found and return unless @ride
  end

  def set_car
    @car = @ride.cars.find_by(id: params[:id])
    render plain: 'Voiture introuvable', status: :not_found and return unless @car
  end

  def driver_params
    params.permit(:name, :origin, :departure_time, :seats_total, :driver_name, :pickup_address, :latitude, :longitude)
  end
end
