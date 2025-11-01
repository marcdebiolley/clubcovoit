class AddTelephoneToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :telephone, :string
  end
end
