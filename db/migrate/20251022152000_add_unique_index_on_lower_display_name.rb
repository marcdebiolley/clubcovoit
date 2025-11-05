name: CI

on:
  push:
    branches: [ "main" ]
  pull_request:

jobs:
  build:
    name: Lint, scan and tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Ruby 3.2.9
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2.9'
          bundler-cache: true

      - name: Install Node (optional, for JS runtime & importmap/esbuild)
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Bundle install (explicit)
        run: |
          bundle config set path 'vendor/bundle'
          bundle config set without 'development test'
          bundle install --jobs 4 --retry 3

      - name: Run RuboCop if present
        run: |
          if bundle list | grep -q rubocop; then
            bundle exec rubocop --parallel
          else
            echo "Rubocop not in Gemfile – skipping";
          fi

      - name: Run Brakeman if present
        run: |
          if bundle list | grep -q brakeman; then
            bundle exec brakeman -q -w2
          else
            echo "Brakeman not in Gemfile – skipping";
          fi

      - name: Run RSpec if present
        env:
          RAILS_ENV: test
        run: |
          if bundle list | grep -q rspec-core; then
            bundle exec rake db:create db:schema:load 2>/dev/null || true
            bundle exec rspec --format progress
          else
            echo "RSpec not in Gemfile – skipping";
          fi
