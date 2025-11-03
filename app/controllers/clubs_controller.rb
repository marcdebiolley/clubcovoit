class ClubsController < ActionController::Base
  protect_from_forgery with: :exception

  before_action :require_login
  before_action :set_group, only: [ :show, :members, :stats ]

  def index
    redirect_to "/clubs.html"
  end

  def show
    redirect_to "/club-detail.html?id=#{@group.id}"
  end

  def members
    users = @group.memberships.includes(:user).map do |m|
      {
        id: m.user_id,
        display_name: m.user.display_name,
        first_name: m.user.first_name,
        last_name: m.user.last_name,
        avatar_url: m.user.avatar_url,
        role: m.role
      }
    end
    render json: { members: users }
  end

  def stats
    rides = Ride.where(group_id: @group.id)
    upcoming = rides.where("date >= ?", Date.today).count
    total = rides.count
    members_count = @group.memberships.count
    render json: { total_events: total, upcoming_events: upcoming, members: members_count }
  end

  private

  def require_login
    # Rely on token-based frontend for now; allow page render
    true
  end

  def current_user
    # We keep API-token auth on frontend; this is a placeholder to avoid errors
    nil
  end

  def set_group
    @group = Group.find_by(invite_code: params[:share_token])
    render plain: "Club introuvable", status: :not_found unless @group
  end
end
