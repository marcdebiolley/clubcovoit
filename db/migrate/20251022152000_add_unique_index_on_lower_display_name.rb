class AddUniqueIndexOnLowerDisplayName < ActiveRecord::Migration[7.1]
  def up
    execute <<~SQL
      CREATE UNIQUE INDEX index_users_on_lower_display_name
      ON users ((LOWER(display_name)));
    SQL
  end

  def down
    execute <<~SQL
      DROP INDEX IF EXISTS index_users_on_lower_display_name;
    SQL
  end
end
