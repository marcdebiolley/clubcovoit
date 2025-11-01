class CreateRides < ActiveRecord::Migration[8.0]
  def change
    create_table :rides do |t|
      t.string :title
      t.date :date
      t.string :time
      t.string :origin
      t.string :destination
      t.integer :seats_total
      t.integer :seats_taken
      t.text :note
      t.string :invite_code
      t.string :password_salt
      t.string :password_hash
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
    add_index :rides, :invite_code, unique: true
  end
end
