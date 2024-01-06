import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { Client } from "https://deno.land/x/mysql/mod.ts";
import { OpenAPIHono, createRoute, z } from 'npm:@hono/zod-openapi@0.9.5';
import { swaggerUI } from 'npm:@hono/swagger-ui@0.2.1';
import data from "./data.json" assert { type: "json" };


var db_host = Deno.env.get("DB_HOST");
var username = Deno.env.get("DB_USER");
var db = Deno.env.get("DB_NAME");
var password = Deno.env.get("DB_PASSWORD");
// Set up MySQL client
console.log(db_host, username, db)
const client = await new Client().connect({
  hostname: db_host,
  username: username,
  db: db,
  password: password,
  ssl: {
    rejectUnauthorized: true,
  },
});

const app = new OpenAPIHono()

app.openapi(
  createRoute({
    method: 'get',
    path: '/hello',
    responses: {
      200: {
        description: 'Respond a message',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string()
            })
          }
        }
      }
    }
  }),
  (c) => {
    return c.jsonT({
      message: 'hello'
    })
  }
)


app.openapi(
  createRoute({
    method: 'get',
    path: '/test',
    responses: {
      200: {
        description: 'Respond a test',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string()
            })
          }
        }
      }
    }
  }),
  (c) => {
    return c.jsonT({
      message: 'test'
    })
  }
)

app.openapi(
  createRoute({
    method: 'get',
    path: '/api/groceries',
    parameters: [
      {
        name: 'start_date',
        in: 'query',
        required: true,
        description: 'Start date for fetching groceries',
        schema: {
          type: 'string',
          format: 'date' // or 'date-time' depending on your format
        }
      },
      {
        name: 'end_date',
        in: 'query',
        required: true,
        description: 'End date for fetching groceries',
        schema: {
          type: 'string',
          format: 'date' // or 'date-time' depending on your format
        }
      }
    ],
    responses: {
      200: {
        description: 'List of groceries within the specified date range',
        content: {
          'application/json': {
            schema: {/* Define your response schema here */}
          }
        }
      },
      400: {
        description: 'Invalid request parameters'
      },
      500: {
        description: 'Internal Server Error'
      }
    }
  }),
  async (c) => {
    const start_date = c.req.query("start_date");
    const end_date = c.req.query("end_date");

    const query = `
    SELECT * FROM grocery
    WHERE start_date >= ? AND end_date <= ?;
  `;

    try {
      const result = await client.execute(query, [start_date, end_date]);
      return c.json(result);
    } catch (error) {
      console.error(error);
      return c.text("An error occurred.", 500);
    }
    // Your existing logic to fetch and return groceries
  }
);


app.get("/", (c) => c.text("Welcome to dinosaur API!"));

app.get("/api/", (c) => c.json(data));

app.get("/api/dino/:dinosaur", (c) => {
  const dinosaur = c.req.param("dinosaur").toLowerCase();
  const found = data.find((item) => item.name.toLowerCase() === dinosaur);
  if (found) {
    return c.json(found);
  } else {
    return c.text("No dinosaurs found.");
  }
});

app.get("/api/groceriesLegacy", async (c) => {
  const start_date = c.req.query("start_date");
  const end_date = c.req.query("end_date");

  const query = `
    SELECT * FROM grocery
    WHERE start_date >= ? AND end_date <= ?;
  `;

  try {
    const result = await client.execute(query, [start_date, end_date]);
    return c.json(result);
  } catch (error) {
    console.error(error);
    return c.text("An error occurred.", 500);
  }
});

app.get('/ui', swaggerUI({ url: '/doc' }));

app.doc('/doc', {
  info: {
    title: 'An API',
    version: 'v1'
  },
  openapi: '3.1.0'
});


Deno.serve(app.fetch);
