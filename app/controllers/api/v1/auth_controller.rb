class Api::V1::AuthController < ApplicationController
  skip_before_action :require_user!, only: [ :signup, :login ], raise: false
  def signup
    email = params[:email].to_s.downcase
    password = params[:password].to_s
    display_name = params[:display_name].presence
    first_name = params[:first_name].presence
    last_name = params[:last_name].presence
    return render json: { error: "Missing email/password" }, status: :bad_request if email.blank? || password.blank?

    if User.exists?(email: email)
      return render json: { error: "EMAIL_EXISTS" }, status: :conflict
    end

    user = User.new(email: email, display_name: display_name, password: password, first_name: first_name, last_name: last_name)
    if user.save
      token = encode_token({ user_id: user.id, exp: 7.days.from_now.to_i })
      render json: { token: token, user: { id: user.id, email: user.email, display_name: user.display_name, first_name: user.first_name, last_name: user.last_name } }, status: :created
    else
      render json: { error: "VALIDATION_ERROR", details: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def login
    email = params[:email].to_s.downcase
    password = params[:password].to_s
    return render json: { error: "Missing email/password" }, status: :bad_request if email.blank? || password.blank?

    user = User.find_by(email: email)
    unless user&.authenticate(password)
      return render json: { error: "INVALID_CREDENTIALS" }, status: :unauthorized
    end
    token = encode_token({ user_id: user.id, exp: 7.days.from_now.to_i })
    render json: { token: token, user: { id: user.id, email: user.email, display_name: user.display_name } }
  end
end
