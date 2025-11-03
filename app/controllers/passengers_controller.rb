class PassengersController < ActionController::Base
  protect_from_forgery with: :exception

  before_action :set_group
  before_action :set_ride
  before_action :set_participant, only: [ :destroy ]

  # POST /clubs/:share_token/events/:event_id/passengers
  def create
    name = params[:name].to_s.strip
    return redirect_back fallback_location: "/ride.html?id=#{@ride.id}", alert: "Nom requis" if name.blank?

    passenger = @ride.participants.build(name: name, role: "passenger")

    car = nil
    if params[:car_id].present?
      car = @ride.cars.find_by(id: params[:car_id])
      car = nil if car && car.capacity_left <= 0
    end
    car ||= @ride.cars.detect { |c| c.capacity_left > 0 }

    passenger.car_id = car.id if car

    if passenger.save
      car&.recalc_seats_taken!
      redirect_to "/ride.html?id=#{@ride.id}", notice: "Inscrit comme passager."
    else
      redirect_to "/ride.html?id=#{@ride.id}", alert: "Inscription impossible."
    end
  end

  # DELETE /clubs/:share_token/events/:event_id/passengers/:id
  def destroy
    car = @participant.car_id ? @ride.cars.find_by(id: @participant.car_id) : nil
    @participant.destroy!
    car&.recalc_seats_taken!
    redirect_to "/ride.html?id=#{@ride.id}", notice: "Passager retiré."
  end

  private

  def set_group
    @group = Group.find_by(invite_code: params[:club_share_token] || params[:share_token])
    render plain: "Club introuvable", status: :not_found and return unless @group
  end

  def set_ride
    @ride = Ride.find_by(id: params[:event_id] || params[:event], group_id: @group.id)
    render plain: "Événement introuvable", status: :not_found and return unless @ride
  end

  def set_participant
    @participant = @ride.participants.find_by(id: params[:id], role: "passenger")
    render plain: "Passager introuvable", status: :not_found and return unless @participant
  end
end
