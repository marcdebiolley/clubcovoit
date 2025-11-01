class AddLocationToCars < ActiveRecord::Migration[8.0]
  def change
    add_column :cars, :pickup_address, :string
    add_column :cars, :latitude, :decimal, precision: 10, scale: 6
    add_column :cars, :longitude, :decimal, precision: 10, scale: 6
  end
end
