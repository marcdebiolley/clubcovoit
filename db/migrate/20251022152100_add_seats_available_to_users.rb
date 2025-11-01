class AddSeatsAvailableToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :seats_available, :integer
  end
end
