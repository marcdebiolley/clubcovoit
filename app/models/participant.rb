class Participant < ApplicationRecord
  belongs_to :ride

  validates :name, presence: true
  validates :role, inclusion: { in: %w[driver passenger] }
  validates :seats_offered, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
end
