class User < ApplicationRecord
  has_secure_password

  has_many :rides, dependent: :nullify
  has_many :memberships, dependent: :destroy
  has_many :groups, through: :memberships

  validates :email, presence: true, uniqueness: true
  validates :display_name, presence: true, uniqueness: { case_sensitive: false }
end
