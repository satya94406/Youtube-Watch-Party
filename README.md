# YouTube Watch Party

## Run backend
```bash
cd backend
mvn spring-boot:run
```
Backend: http://localhost:8080

## Run frontend
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```
Frontend: http://localhost:5173

## Test
Open http://localhost:5173 in two browser tabs.
Use the same room code.
First user becomes HOST. Second user becomes PARTICIPANT.
HOST can play/pause/seek/change video. HOST can make participant MODERATOR.
