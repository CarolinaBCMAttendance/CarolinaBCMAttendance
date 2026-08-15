const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createApp } = require("../server");

const ATTENDANCE_FILE = path.join(__dirname, "..", "data", "attendance.json");

describe("BCM attendance API", () => {
  let server;
  let baseUrl;
  let originalAttendance;

  before(async () => {
    originalAttendance = await fs.readFile(ATTENDANCE_FILE, "utf8");
    await fs.writeFile(ATTENDANCE_FILE, "[]\n");

    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}/api/v1/bcm`;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.writeFile(ATTENDANCE_FILE, originalAttendance);
  });

  it("lists classes by name", async () => {
    const response = await fetch(`${baseUrl}/classes`);
    assert.equal(response.status, 200);
    const classes = await response.json();
    assert.ok(Array.isArray(classes));
    assert.ok(classes.length > 0);
    assert.ok(classes[0].name);
    assert.ok(classes[0].id);
  });

  it("returns registered people as first/last name cards for a class", async () => {
    const classesResponse = await fetch(`${baseUrl}/classes`);
    const classes = await classesResponse.json();
    const classId = classes[0].id;

    const response = await fetch(`${baseUrl}/classes/${classId}/people`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.class.id, classId);
    assert.ok(payload.people.length > 0);
    assert.ok(payload.people[0].firstName);
    assert.ok(payload.people[0].lastName);
    assert.equal(
      payload.people[0].name,
      `${payload.people[0].firstName} ${payload.people[0].lastName}`
    );
  });

  it("checks people in as attending a meeting", async () => {
    const classes = await (await fetch(`${baseUrl}/classes`)).json();
    const klass = classes[0];
    const { people } = await (
      await fetch(`${baseUrl}/classes/${klass.id}/people`)
    ).json();
    const attendee = people[0];

    const response = await fetch(`${baseUrl}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-08-11",
        classId: klass.id,
        time: "7:30",
        peopleIds: [attendee.id],
      }),
    });

    assert.equal(response.status, 201);
    const payload = await response.json();
    assert.equal(payload.record.className, klass.name);
    assert.equal(payload.record.attendees.length, 1);
    assert.equal(payload.record.attendees[0].firstName, attendee.firstName);
    assert.equal(payload.record.attendees[0].lastName, attendee.lastName);

    const attendance = await (await fetch(`${baseUrl}/attendance?classId=${klass.id}`)).json();
    assert.ok(attendance.some((record) => record.id === payload.record.id));
  });

  it("supports legacy /record with group_name and names", async () => {
    const classes = await (await fetch(`${baseUrl}/classes`)).json();
    const klass = classes[1];
    const { people } = await (
      await fetch(`${baseUrl}/classes/${klass.id}/people`)
    ).json();
    const names = people.slice(0, 2).map((person) => person.name);

    const response = await fetch(`${baseUrl}/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-08-11",
        group_name: klass.name,
        time: "9:30",
        names: names.join(","),
      }),
    });

    assert.equal(response.status, 201);
    const payload = await response.json();
    assert.equal(payload.record.attendees.length, 2);
  });
});
