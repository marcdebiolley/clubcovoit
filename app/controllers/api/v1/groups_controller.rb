class Api::V1::GroupsController < ApplicationController
  before_action :require_user!
  before_action :set_group, only: %i[show update destroy leave update_member_role add_member]

  # GET /api/v1/groups
  # Returns groups where current_user is member
  def index
    groups = current_user.groups.includes(:memberships)
    render json: groups.map { |g|
      role = g.memberships.find { |m| m.user_id == current_user.id }&.role
      {
        id: g.id,
        name: g.name,
        description: g.description,
        kind: g.kind,
        role: role,
        members_count: g.memberships.size,
        events_count: (defined?(Ride) ? Ride.where(group_id: g.id).count : nil),
        invite_code: (role == 'owner' ? g.invite_code : nil)
      }
    }
  end

  # PATCH /api/v1/groups/:id { name, description, kind }
  def update
    membership = @group.memberships.find_by(user_id: current_user.id)
    return render json: { error: 'FORBIDDEN' }, status: :forbidden unless membership&.role == 'owner'

    permitted = {}
    permitted[:name] = params[:name].to_s.strip if params.key?(:name)
    permitted[:description] = params[:description].to_s if params.key?(:description)
    permitted[:kind] = params[:kind].presence if params.key?(:kind)

    if permitted[:name].present? && permitted[:name].length < 2
      return render json: { error: 'NAME_TOO_SHORT' }, status: :unprocessable_entity
    end

    @group.update!(permitted)
    render json: { ok: true }
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: 'VALIDATION_ERROR', details: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  # PATCH /api/v1/groups/:id/members/:user_id { role: 'owner' | 'member' }
  def update_member_role
    requester = @group.memberships.find_by(user_id: current_user.id)
    return render json: { error: 'FORBIDDEN' }, status: :forbidden unless requester&.role == 'owner'

    target_user_id = params[:user_id].to_i
    membership = @group.memberships.find_by(user_id: target_user_id)
    return render json: { error: 'NOT_MEMBER' }, status: :not_found unless membership

    role = params[:role].to_s
    return render json: { error: 'INVALID_ROLE' }, status: :bad_request unless %w[owner member].include?(role)

    # Do not allow demoting the last remaining owner
    if membership.role == 'owner' && role == 'member'
      owners_count = @group.memberships.where(role: 'owner').count
      return render json: { error: 'LAST_OWNER_REQUIRED' }, status: :unprocessable_entity if owners_count <= 1
    end
    membership.update!(role: role)
    render json: { ok: true }
  end

  # POST /api/v1/groups
  def create
    name = params[:name].to_s.strip
    description = params[:description].to_s
    kind = params[:kind].presence
    return render json: { error: 'NAME_REQUIRED' }, status: :bad_request if name.blank?

    group = Group.new(user: current_user, name: name, description: description, kind: kind)
    group.save!
    Membership.create!(group: group, user: current_user, role: 'owner')
    render json: { id: group.id, invite_code: group.invite_code }, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: 'VALIDATION_ERROR', details: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  # POST /api/v1/groups/join { invite_code }
  def join
    code = params[:invite_code].to_s.strip
    return render json: { error: 'CODE_REQUIRED' }, status: :bad_request if code.blank?

    group = Group.find_by(invite_code: code)
    return render json: { error: 'NOT_FOUND' }, status: :not_found unless group

    Membership.find_or_create_by!(group: group, user: current_user) do |m|
      m.role = 'member'
    end
    render json: { ok: true, id: group.id }
  end

  # GET /api/v1/groups/:id
  def show
    membership = @group.memberships.find_by(user_id: current_user.id)
    return render json: { error: 'FORBIDDEN' }, status: :forbidden unless membership

    rides_scope = Ride.where(group_id: @group.id).order(date: :asc, time: :asc)
    rides = rides_scope.map do |r|
      drivers_count = begin
        r.participants.where(role: 'driver').count
      rescue StandardError
        nil
      end
      passengers_count = begin
        r.participants.where(role: 'passenger').count
      rescue StandardError
        nil
      end
      {
        id: r.id,
        title: r.title,
        date: r.date,
        time: r.time,
        origin: r.origin,
        destination: r.destination,
        seats_total: r.seats_total,
        seats_taken: r.seats_taken,
        drivers_count: drivers_count,
        passengers_count: passengers_count
      }
    end
    members = @group.memberships.includes(:user).map do |m|
      {
        id: m.user_id,
        display_name: m.user.display_name,
        first_name: m.user.first_name,
        last_name: m.user.last_name,
        avatar_url: m.user.avatar_url,
        role: m.role
      }
    end
    render json: {
      id: @group.id,
      name: @group.name,
      description: @group.description,
      kind: @group.kind,
      invite_code: (membership.role == 'owner' ? @group.invite_code : nil),
      role: membership.role,
      members_count: @group.memberships.size,
      members: members,
      rides: rides
    }
  end

  # DELETE /api/v1/groups/:id
  def destroy
    membership = @group.memberships.find_by(user_id: current_user.id)
    return render json: { error: 'FORBIDDEN' }, status: :forbidden unless membership&.role == 'owner'

    @group.destroy!
    render json: { ok: true }
  end

  # DELETE /api/v1/groups/:id/leave
  def leave
    membership = @group.memberships.find_by(user_id: current_user.id)
    return render json: { error: 'NOT_MEMBER' }, status: :not_found unless membership

    if membership.role == 'owner'
      # Owner leaving: ensure another owner remains. If possible, transfer to oldest other member.
      others = @group.memberships.where.not(id: membership.id).order(:created_at)
      return render json: { error: 'ONLY_OWNER_CANNOT_LEAVE' }, status: :unprocessable_entity unless others.exists?

      eldest = others.first
      eldest.update!(role: 'owner') unless eldest.role == 'owner'
      membership.destroy!

    # Only member is the owner -> cannot leave without deleting group

    else
      membership.destroy!
    end
    render json: { ok: true }
  end

  # POST /api/v1/groups/:id/members { email }
  def add_member
    membership = @group.memberships.find_by(user_id: current_user.id)
    return render json: { error: 'FORBIDDEN' }, status: :forbidden unless membership

    email = params[:email].to_s.strip.downcase
    return render json: { error: 'EMAIL_REQUIRED' }, status: :bad_request if email.blank?

    user = User.find_by(email: email)
    return render json: { error: 'USER_NOT_FOUND' }, status: :not_found unless user

    Membership.find_or_create_by!(group: @group, user: user) { |m| m.role = 'member' }
    render json: { ok: true }
  end

  private

  def set_group
    @group = Group.find_by(id: params[:id])
    render json: { error: 'NOT_FOUND' }, status: :not_found unless @group
  end
end
