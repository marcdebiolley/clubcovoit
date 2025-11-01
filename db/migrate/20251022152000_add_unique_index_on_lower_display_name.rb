je class AddUniqueIndexOnLowerDisplayName < ActiveRecord::Migration[8.0]
  def up
    execute <<~SQL
      CREATE UNIQUE INDEX IF NOT EXISTS index_users_on_lower_display_name
      ON users (lower(display_name));
    SQL
  end

  def down
    execute "DROP INDEX IF EXISTS index_users_on_lower_display_name"
  end
end
