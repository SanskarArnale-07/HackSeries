# Space Situational Awareness

Frontend module for the team project. The project workspace is structured so backend code can be added alongside `frontend/`.

## Project structure

- `frontend/` — browser application and styles
- `backend/` — reserved for the backend implementation from the team

## Run the frontend

Open `frontend/index.html` in a browser, or run a local static server from the project root:

```powershell
python -m http.server 8765 --directory frontend
```

Then open `http://localhost:8765`.

The interface currently contains no mission records, object records, weather measurements, model outputs, reports, or maneuver values. Those views are intentionally empty until the backend integration is ready. The only account label is `User 1`.
