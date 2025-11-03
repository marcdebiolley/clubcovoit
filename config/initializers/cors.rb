Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(/localhost:\d+/, 'http://localhost', 'http://127.0.0.1')

    resource '*',
             headers: :any,
             expose: ['X-User-Token'],
             methods: %i[get post put patch delete options head]
  end
end
