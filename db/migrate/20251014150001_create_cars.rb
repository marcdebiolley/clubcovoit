class CreateCars < ActiveRecord::Migration[8.0]
  def change
    create_table :cars do |t|
      t.references :ride, null: false, foreign_key: true
      t.string :name
      t.string :origin
      t.string :departure_time
      t.integer :seats_total, null: false, default: 4
      t.integer :seats_taken, null: false, default: 0
      t.string :driver_name
      t.timestamps
    end
  end
end
