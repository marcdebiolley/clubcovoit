source "https://rubygems.org"

# Bundle edge Rails instead: gem "rails", github: "rails/rails", branch: "main"
gem "rails", "~> 8.0.3"
# Use PostgreSQL as the database for Active Record
gem "pg", "~> 1.5"
# Use the Puma web server
gem "puma", ">= 5.0"

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem "tzinfo-data", platforms: %i[ windows jruby ]

# Use the database-backed adapters for Rails.cache, Active Job, and Action Cable
gem "solid_cache"
gem "solid_queue"
gem "solid_cable"

# Reduces boot times through caching; required in config/boot.rb
gem "bootsnap", require: false

# Deploy this application anywhere as a Docker container
gem "kamal", require: false

# Add HTTP asset caching/compression and X-Sendfile acceleration to Puma
gem "thruster", require: false

# Development tools
group :development do
  # Debugging in development
  gem "debug", platforms: [ :mri ]

  # Static analysis for security vulnerabilities
  gem "brakeman", require: false

  # Omakase Ruby styling for Rails
  gem "rubocop-rails-omakase", require: false
end

# Auth and API
gem "bcrypt", "~> 3.1"
gem "jwt", "~> 3.1"
gem "rack-cors", "~> 3.0"
