class Group < ApplicationRecord
  belongs_to :user # owner
  has_many :memberships, dependent: :destroy
  has_many :users, through: :memberships
  has_many :rides, dependent: :nullify

  validates :name, presence: true
  validates :invite_code, presence: true, uniqueness: true

  before_validation :ensure_invite_code

  private

  def ensure_invite_code
    self.invite_code ||= SecureRandom.hex(4)
  end
end
