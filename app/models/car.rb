class Car < ApplicationRecord
  belongs_to :ride
  has_many :participants, dependent: :destroy

  validates :seats_total, numericality: { greater_than_or_equal_to: 1 }

  # Callback pour gérer la suppression des participants avant destruction
  before_destroy :handle_participants_before_destroy

  private

  def handle_participants_before_destroy
    # Supprimer les conducteurs, garder les passagers sans voiture
    participants.where(role: "driver").destroy_all
    participants.where(role: "passenger").update_all(car_id: nil)
  end

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
