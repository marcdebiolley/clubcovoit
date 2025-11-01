class CreateGroups < ActiveRecord::Migration[8.0]
  def change
    create_table :groups do |t|
      t.references :user, null: false, foreign_key: true # owner
      t.string :name, null: false
      t.text :description
      t.string :invite_code, null: false
      t.timestamps
    end
    add_index :groups, :invite_code, unique: true
  end
end
