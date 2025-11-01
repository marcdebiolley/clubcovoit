Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # Frontend statique (HTML dans /public)
  root to: redirect('/index.html')
  get '/app', to: redirect('/index.html')

  resources :clubs, param: :share_token, only: [:index, :show] do
    # Nested events (minimal for now)
    resources :events, only: [:show]

    # Drivers/Passengers endpoints (stubs that will delegate to API or ActiveRecord)
    resources :events, only: [] do
      resources :drivers, only: [:create, :destroy]
      resources :passengers, only: [:create, :destroy]
    end

    member do
      get :members
      get :stats
    end
  end

  namespace :api do
    namespace :v1 do
      post "auth/signup", to: "auth#signup"
      post "auth/login", to: "auth#login"
      get  "users/unique", to: "users#unique"

      get  "rides/resolve", to: "rides#resolve"
      post "rides/:id/auth", to: "rides#authenticate"

      resources :rides, only: [:index, :create, :show, :update, :destroy] do
        resources :cars, only: [:index, :create]
        resources :participants, only: [:create]
      end
      get  "my_rides", to: "rides#mine"
      get  "my_upcoming_rides", to: "rides#my_upcoming_rides"
      get  "me", to: "me#show"
      patch "me", to: "me#update"

      resources :cars, only: [:update, :destroy]
      resources :participants, only: [:destroy, :update]

      resources :groups, only: [:index, :create, :show, :update, :destroy] do
        post :join, on: :collection
        delete :leave, on: :member
        patch 'members/:user_id', to: 'groups#update_member_role', on: :member
        post :members, on: :member, action: :add_member
      end
    end
  end
end
