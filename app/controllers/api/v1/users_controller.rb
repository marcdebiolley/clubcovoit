class Api::V1::UsersController < ApplicationController
  # Unique pseudo check is public (no auth required to suggest availability on signup)
  skip_before_action :require_user!, only: [:unique]

  def unique
    name = (params[:display_name] || "").to_s.strip
    unique = name.present? && !User.where("LOWER(display_name) = LOWER(?)", name).exists?
    render json: { unique: unique }
  end
end
