The game is deployed on firebase (https://turtlerun-c9f1b.web.app)
-- run 'firebase deploy' to deploy the latest version

Another option is to run locally, e.g., using http-server (this still needs internet to access scores from the firebase)
-- cd public/
-- http-server

Realtime database was deployed on firebase that the game accesses through RESTful APIs: https://turtlerun-c9f1b-default-rtdb.firebaseio.com
-- get scores: curl 'https://turtlerun-c9f1b-default-rtdb.firebaseio.com/scores.json'
-- set score: curl -X PUT -d '{ "level":1, "seagulls":1 }' 'https://turtlerun-c9f1b-default-rtdb.firebaseio.com/scores/username.json'
