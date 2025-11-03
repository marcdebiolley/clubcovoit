class EventsController < ActionController::Base
  protect_from_forgery with: :exception

  before_action :set_group
  before_action :set_ride

  def show
    redirect_to "/ride.html?id=#{@ride.id}"
  end

  private

  def set_group
    @group = Group.find_by(invite_code: params[:club_share_token] || params[:share_token])
    render plain: "Club introuvable", status: :not_found and return unless @group
  end

  def set_ride
    @ride = Ride.find_by(id: params[:id], group_id: @group.id)
    render plain: "Événement introuvable", status: :not_found unless @ride
  end
end
