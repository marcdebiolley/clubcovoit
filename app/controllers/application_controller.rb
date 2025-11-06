class ApplicationController < ActionController::API
  include Authentication
  before_action :require_user!
end
