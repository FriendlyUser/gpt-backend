import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { config } from 'https://deno.land/x/dotenv/mod.ts';
import { Client } from "https://deno.land/x/mysql/mod.ts";
import { OpenAPIHono, createRoute, z } from 'npm:@hono/zod-openapi@0.9.5';
import { swaggerUI } from 'npm:@hono/swagger-ui@0.2.1';
import data from "./data.json" assert { type: "json" };

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

const env = config();

// Set up MySQL client
const client = await new Client().connect({
  hostname: env.DB_HOST,
  username: env.DB_USER,
  db: env.DB_NAME,
  password: env.DB_PASSWORD,
  ssl: {
    mode: "disabled",
  },
});

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

app.get("/api/groceries", async (c) => {
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
