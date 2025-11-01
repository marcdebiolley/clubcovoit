class Membership < ApplicationRecord
  belongs_to :group
  belongs_to :user

  ROLES = %w[owner admin member].freeze

  validates :role, inclusion: { in: ROLES }
  validates :user_id, uniqueness: { scope: :group_id }
end
