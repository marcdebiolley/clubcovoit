class ApplicationController < ActionController::API
  include Authentication
  before_action :require_user!

  private
  def require_user!
    if respond_to?(:current_user, true) && current_user
      return
    end

    render json: { error: 'unauthorized' }, status: :unauthorized
  end
end
