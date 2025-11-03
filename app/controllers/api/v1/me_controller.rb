class Api::V1::MeController < ApplicationController
  before_action :require_user!

  # GET /api/v1/me
  def show
    render json: current_user.slice(:id, :email, :display_name, :first_name, :last_name, :car_type, :avatar_url,
                                    :seats_available, :telephone)
  end

  # PATCH /api/v1/me
  def update
    if current_user.update(me_params)
      render json: current_user.slice(:id, :email, :display_name, :first_name, :last_name, :car_type, :avatar_url,
                                      :seats_available, :telephone)
    else
      render json: { error: 'VALIDATION_ERROR', details: current_user.errors.full_messages },
             status: :unprocessable_entity
    end
  end

  private

  def me_params
    params.permit(:display_name, :first_name, :last_name, :car_type, :avatar_url, :seats_available, :telephone)
  end
end
