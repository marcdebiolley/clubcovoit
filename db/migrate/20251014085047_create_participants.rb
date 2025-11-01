class CreateParticipants < ActiveRecord::Migration[8.0]
  def change
    create_table :participants do |t|
      t.references :ride, null: false, foreign_key: true
      t.string :name
      t.string :role
      t.integer :seats_offered

      t.timestamps
    end
  end
end
