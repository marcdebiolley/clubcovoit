class AddGroupToRides < ActiveRecord::Migration[8.0]
  def change
    add_reference :rides, :group, foreign_key: true, null: true
  end
end
