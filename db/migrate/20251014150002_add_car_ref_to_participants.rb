class AddCarRefToParticipants < ActiveRecord::Migration[8.0]
  def change
    add_reference :participants, :car, foreign_key: true, null: true
  end
end
