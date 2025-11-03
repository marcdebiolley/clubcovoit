class Car < ApplicationRecord
  belongs_to :ride
  has_many :participants, dependent: :nullify

  validates :seats_total, numericality: { greater_than_or_equal_to: 1 }

  def recalc_seats_taken!
    update!(seats_taken: participants.where(role: "passenger").count)
  end

  def passenger_count
    participants.where(role: "passenger").count
  end

  def capacity_left
    (seats_total || 0) - passenger_count
  end
end
