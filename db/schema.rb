# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_10_30_143000) do
  # These are extensions that must be enabled in order to support this database

  create_table "cars", force: :cascade do |t|
    t.bigint "ride_id", null: false
    t.string "name"
    t.string "origin"
    t.string "departure_time"
    t.integer "seats_total", default: 4, null: false
    t.integer "seats_taken", default: 0, null: false
    t.string "driver_name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "pickup_address"
    t.decimal "latitude", precision: 10, scale: 6
    t.decimal "longitude", precision: 10, scale: 6
    t.index ["ride_id"], name: "index_cars_on_ride_id"
  end

  create_table "groups", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.text "description"
    t.string "invite_code", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "kind"
    t.index ["invite_code"], name: "index_groups_on_invite_code", unique: true
    t.index ["user_id"], name: "index_groups_on_user_id"
  end

  create_table "memberships", force: :cascade do |t|
    t.bigint "group_id", null: false
    t.bigint "user_id", null: false
    t.string "role", default: "member", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["group_id", "user_id"], name: "index_memberships_on_group_id_and_user_id", unique: true
    t.index ["group_id"], name: "index_memberships_on_group_id"
    t.index ["user_id"], name: "index_memberships_on_user_id"
  end

  create_table "participants", force: :cascade do |t|
    t.bigint "ride_id", null: false
    t.string "name"
    t.string "role"
    t.integer "seats_offered"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "car_id"
    t.index ["car_id"], name: "index_participants_on_car_id"
    t.index ["ride_id"], name: "index_participants_on_ride_id"
  end

  create_table "rides", force: :cascade do |t|
    t.string "title"
    t.date "date"
    t.string "time"
    t.string "origin"
    t.string "destination"
    t.integer "seats_total"
    t.integer "seats_taken"
    t.text "note"
    t.string "invite_code"
    t.string "password_salt"
    t.string "password_hash"
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "group_id"
    t.index ["group_id"], name: "index_rides_on_group_id"
    t.index ["invite_code"], name: "index_rides_on_invite_code", unique: true
    t.index ["user_id"], name: "index_rides_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email"
    t.string "display_name"
    t.string "password_digest"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "first_name"
    t.string "last_name"
    t.string "car_type"
    t.string "avatar_url"
    t.integer "seats_available"
    t.string "telephone"
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "cars", "rides"
  add_foreign_key "groups", "users"
  add_foreign_key "memberships", "groups"
  add_foreign_key "memberships", "users"
  add_foreign_key "participants", "cars"
  add_foreign_key "participants", "rides"
  add_foreign_key "rides", "groups"
  add_foreign_key "rides", "users"
end
