class Ride < ApplicationRecord
  belongs_to :user
  has_many :participants, dependent: :destroy
  has_many :cars, dependent: :destroy

  validates :title, :date, :destination, presence: true
  validates :seats_total, numericality: { greater_than_or_equal_to: 1 }

  before_create :ensure_invite_code

  def ensure_invite_code
    self.invite_code ||= SecureRandom.hex(5)
  end

  # Password protection for the ride using BCrypt
  def set_password(password)
    return if password.blank?

    self.password_hash = BCrypt::Password.create(password)
  end

  def protected?
    password_hash.present?
  end

  def verify_password(password)
    return true unless protected?
    return false if password.blank?

    BCrypt::Password.new(password_hash) == password
  rescue StandardError
    false
  end
end
