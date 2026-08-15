const path = require("path");
const fs = require("fs/promises");
const express = require("express");
const cors = require("cors");

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, "data");
const CLASSES_FILE = path.join(DATA_DIR, "classes.json");
const PEOPLE_FILE = path.join(DATA_DIR, "people.json");
const ATTENDANCE_FILE = path.join(DATA_DIR, "attendance.json");

/**
 * Build CORS options for same-origin or split hosting.
 * - Unset / empty / "*": allow any origin (fine for local/dev)
 * - CORS_ORIGIN / FRONTEND_ORIGIN: comma-separated allowlist, e.g.
 *   "https://attendance.example.com,http://localhost:5500"
 */
function createCorsOptions(env = process.env) {
  const raw = String(env.CORS_ORIGIN || env.FRONTEND_ORIGIN || "").trim();
  if (!raw || raw === "*") {
    return { origin: true };
  }

  const allowed = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      // Non-browser clients and same-origin navigations may omit Origin.
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  };
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT" && fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function fullName(person) {
  return `${person.firstName} ${person.lastName}`.trim();
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseNames(names) {
  if (Array.isArray(names)) {
    return names.map((name) => String(name).trim()).filter(Boolean);
  }
  if (typeof names === "string") {
    return names
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  }
  return [];
}

function createApp(options = {}) {
  const app = express();
  const corsOptions =
    options.corsOptions !== undefined
      ? options.corsOptions
      : createCorsOptions(options.env || process.env);

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.static(__dirname));

  const api = express.Router();

  api.get("/health", (_req, res) => {
    res.json({
      ok: true,
      organization: "BCM at University of South Carolina",
      service: "CarolinaBCMAttendance",
    });
  });

  // Classes organized by class name (also exposed as /groups for the UI).
  api.get("/classes", async (_req, res, next) => {
    try {
      const classes = await readJson(CLASSES_FILE, []);
      res.json(
        classes.map((klass) => ({
          id: klass.id,
          name: klass.name,
          leaders: klass.leaders || [],
        }))
      );
    } catch (error) {
      next(error);
    }
  });

  api.get("/groups", async (_req, res, next) => {
    try {
      const classes = await readJson(CLASSES_FILE, []);
      res.json(classes.map((klass) => ({ id: klass.id, name: klass.name })));
    } catch (error) {
      next(error);
    }
  });

  api.get("/classes/:classId/people", async (req, res, next) => {
    try {
      const classes = await readJson(CLASSES_FILE, []);
      const people = await readJson(PEOPLE_FILE, []);
      const klass = classes.find((item) => item.id === req.params.classId);

      if (!klass) {
        res.status(404).json({ error: "Class not found" });
        return;
      }

      const registered = people
        .filter((person) => person.classId === klass.id)
        .map((person) => ({
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          name: fullName(person),
          classId: person.classId,
          className: klass.name,
        }))
        .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

      res.json({
        class: { id: klass.id, name: klass.name },
        people: registered,
      });
    } catch (error) {
      next(error);
    }
  });

  // All previously registered people (clickable cards source).
  api.get("/", async (_req, res, next) => {
    try {
      const classes = await readJson(CLASSES_FILE, []);
      const people = await readJson(PEOPLE_FILE, []);
      const classById = new Map(classes.map((klass) => [klass.id, klass.name]));

      res.json(
        people
          .map((person) => ({
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            name: fullName(person),
            classId: person.classId,
            className: classById.get(person.classId) || null,
          }))
          .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
      );
    } catch (error) {
      next(error);
    }
  });

  api.get("/attendance", async (req, res, next) => {
    try {
      const records = await readJson(ATTENDANCE_FILE, []);
      let filtered = records;

      if (req.query.classId) {
        filtered = filtered.filter((record) => record.classId === req.query.classId);
      }
      if (req.query.date) {
        filtered = filtered.filter((record) => record.date === req.query.date);
      }

      res.json(filtered);
    } catch (error) {
      next(error);
    }
  });

  // Check people in as attending a meeting.
  async function recordAttendance(req, res, next) {
    try {
      const {
        date,
        group_name: groupName,
        class_name: className,
        classId,
        time,
        names,
        peopleIds,
      } = req.body || {};

      if (!date) {
        res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
        return;
      }

      const classes = await readJson(CLASSES_FILE, []);
      const people = await readJson(PEOPLE_FILE, []);

      let klass = null;
      if (classId) {
        klass = classes.find((item) => item.id === classId) || null;
      } else {
        const lookupName = className || groupName;
        if (lookupName) {
          klass =
            classes.find(
              (item) => normalizeName(item.name) === normalizeName(lookupName)
            ) || null;
        }
      }

      if (!klass) {
        res.status(400).json({
          error: "Unknown class. Provide classId, class_name, or group_name.",
        });
        return;
      }

      const checkedIn = [];
      const unresolved = [];

      if (Array.isArray(peopleIds) && peopleIds.length > 0) {
        for (const personId of peopleIds) {
          const person = people.find((item) => item.id === personId);
          if (!person || person.classId !== klass.id) {
            unresolved.push(String(personId));
            continue;
          }
          checkedIn.push({
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            name: fullName(person),
          });
        }
      } else {
        const requestedNames = parseNames(names);
        if (requestedNames.length === 0) {
          res.status(400).json({
            error: "Provide peopleIds or names of attendees to check in.",
          });
          return;
        }

        for (const name of requestedNames) {
          const person = people.find(
            (item) =>
              item.classId === klass.id &&
              normalizeName(fullName(item)) === normalizeName(name)
          );
          if (!person) {
            unresolved.push(name);
            continue;
          }
          checkedIn.push({
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            name: fullName(person),
          });
        }
      }

      if (checkedIn.length === 0) {
        res.status(400).json({
          error: "No matching registered people found for this class.",
          unresolved,
        });
        return;
      }

      const records = await readJson(ATTENDANCE_FILE, []);
      const record = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date,
        time: time || null,
        classId: klass.id,
        className: klass.name,
        group_name: klass.name,
        checkedInAt: new Date().toISOString(),
        attendees: checkedIn,
      };

      records.push(record);
      await writeJson(ATTENDANCE_FILE, records);

      res.status(201).json({
        message: "Attendance recorded",
        record,
        unresolved,
      });
    } catch (error) {
      next(error);
    }
  }

  api.post("/record", recordAttendance);
  api.post("/check-in", recordAttendance);

  app.use("/api/v1/bcm", api);

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`BCM UofSC attendance API listening on http://localhost:${PORT}`);
  });
}

module.exports = {
  createApp,
  createCorsOptions,
  fullName,
  parseNames,
  normalizeName,
};
