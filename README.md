# Carolina BCM Attendance

Attendance check-in for **BCM at the University of South Carolina**.

## What it does

- Lists BCM **classes by class name**
- Shows **clickable cards** for people previously registered to a class (first + last name)
- **Checks people in** as attending a meeting and stores attendance records

## Quick start

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## API (`/api/v1/bcm`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health |
| `GET` | `/classes` | Classes organized by name |
| `GET` | `/groups` | Alias of classes (compat) |
| `GET` | `/` | All registered people |
| `GET` | `/classes/:classId/people` | Registered people for one class |
| `POST` | `/check-in` | Check attendees in |
| `POST` | `/record` | Same as `/check-in` (compat) |
| `GET` | `/attendance` | Saved attendance (`?classId=&date=`) |

### Check-in body

```json
{
  "date": "2026-08-11",
  "classId": "class-01",
  "time": "7:30",
  "peopleIds": ["p-001", "p-002"]
}
```

You can also send `class_name` / `group_name` and `names` (array or comma-separated string).

## Data

JSON seed files live in `data/`:

- `classes.json` — class id, name, leaders
- `people.json` — registered people with `firstName`, `lastName`, `classId`
- `attendance.json` — recorded check-ins

## Tests

```bash
npm test
```
