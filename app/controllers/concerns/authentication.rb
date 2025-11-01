module Authentication
  extend ActiveSupport::Concern

  def jwt_secret
    Rails.application.secret_key_base
  end

  def encode_token(payload)
    JWT.encode(payload, jwt_secret, 'HS256')
  end

  def decode_token(token)
    JWT.decode(token, jwt_secret, true, { algorithm: 'HS256' }).first
  rescue
    nil
  end

  # User auth via X-User-Token
  def current_user
    @current_user ||= begin
      token = request.headers['X-User-Token']
      return nil if token.blank?
      payload = decode_token(token)
      return nil unless payload && payload['user_id']
      User.find_by(id: payload['user_id'])
    end
  end

  def require_user!
    render json: { error: 'USER_UNAUTHORIZED' }, status: :unauthorized and return unless current_user
  end

  # Ride token for password-protected rides, passed in Authorization: Bearer <token>
  def sign_ride_token(ride_id, exp: 24.hours.from_now)
    encode_token({ ride_id: ride_id.to_s, exp: exp.to_i })
  end

  def verify_ride_token(ride_id)
    auth = request.headers['Authorization'].to_s
    token = auth.start_with?('Bearer ') ? auth.split(' ', 2).last : nil
    return false if token.blank?
    payload = decode_token(token)
    return false unless payload && payload['ride_id'].to_s == ride_id.to_s
    return false if payload['exp'] && Time.now.to_i > payload['exp'].to_i
    true
  end
end
